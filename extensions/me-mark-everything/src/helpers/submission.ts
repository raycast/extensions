/** One durable intent, shared by Save and Edit. No background queue. */
import {
  Failure,
  getBookmark,
  status,
  statusText,
  submissionSession,
  submit,
  type Command,
  type Entity,
  type Session,
  type Submission,
  type SubmitPhase,
} from "../helper";

export const PENDING_KEY = "me.pendingSubmission.v1";
export type PendingRecord = {
  command: Command;
  libraryId: string;
  entities: string[];
  mode: "create" | "edit";
  phase: "prepared" | "execute" | "readable" | "committed" | "recovering" | "blocked";
};
export type Outcome =
  | { kind: "no-change" }
  | { kind: "rejected"; error: Error }
  | { kind: "pending"; error: Error; phase: PendingRecord["phase"] }
  | { kind: "committed" | "committed-conflict"; entities: Entity[]; sync: string }
  | { kind: "committed-read-failed"; error: Error };
export type Store = {
  getItem: (key: string) => Promise<string | undefined>;
  setItem: (key: string, value: string) => Promise<unknown>;
  removeItem: (key: string) => Promise<unknown>;
};
const asError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));
const rejected = new Set(["INVALID", "BASE_REQUIRED", "CONFLICT", "STALE_RESOLUTION", "PURGED", "CYCLE"]);
const blocked = new Set(["ID_COLLISION", "CORRUPT"]);
const deps = { submit, getBookmark, status, submissionSession };

export class SubmissionController {
  busy = false;
  record?: PendingRecord;
  private generation = 0;
  constructor(
    private storage: Store,
    private api = deps,
    private changed: () => void = () => {},
  ) {}
  private async readRecord(): Promise<PendingRecord | undefined> {
    const raw = await this.storage.getItem(PENDING_KEY);
    if (!raw) return undefined;
    const r = JSON.parse(raw) as PendingRecord;
    if (
      !r ||
      !r.command ||
      typeof r.command.id !== "string" ||
      typeof r.libraryId !== "string" ||
      r.command.libraryId !== r.libraryId ||
      !Array.isArray(r.entities) ||
      !r.entities.length ||
      !Array.isArray(r.command.edits) ||
      JSON.stringify(r.command.edits.map((e) => e.entity)) !== JSON.stringify(r.entities) ||
      !["create", "edit"].includes(r.mode) ||
      !["prepared", "execute", "readable", "committed", "recovering", "blocked"].includes(r.phase)
    )
      throw new Failure("INVALID", "Invalid pending submission. Keep the record and repair it before saving.");
    return r;
  }
  async load() {
    // A mounting view must not replace the active intent with an older disk read.
    if (this.busy || this.record) return;
    const generation = this.generation;
    try {
      const record = await this.readRecord();
      if (!this.busy && generation === this.generation && !this.record) {
        this.record = record;
        this.changed();
      }
    } catch (error) {
      if (!this.busy && generation === this.generation && !this.record) throw error;
    }
  }
  private async restore() {
    // Once loaded, the frozen command and known commit state belong to this controller.
    if (!this.record) this.record = await this.readRecord();
  }
  private async persist(r: PendingRecord) {
    if (["readable", "committed", "recovering", "blocked"].includes(r.phase)) {
      // A failed LocalStorage update cannot undo a receipt already received.
      this.record = r;
      this.changed();
    }
    await this.storage.setItem(PENDING_KEY, JSON.stringify(r));
    this.record = r;
    this.changed();
  }
  private async clear() {
    await this.storage.removeItem(PENDING_KEY);
    this.record = undefined;
    this.changed();
  }
  async start(mode: PendingRecord["mode"], prepare: () => Promise<Submission | null>): Promise<Outcome> {
    if (this.busy)
      return {
        kind: "pending",
        error: new Error("A submission is already running."),
        phase: this.record?.phase ?? "prepared",
      };
    this.busy = true;
    this.generation++;
    this.changed();
    try {
      await this.restore();
      if (this.record)
        return {
          kind: "pending",
          phase: this.record.phase,
          error: new Error("Check the previous submission before saving again."),
        };
      const p = await prepare();
      if (!p) return { kind: "no-change" };
      const record: PendingRecord = {
        command: structuredClone(p.command),
        libraryId: p.session.libraryId,
        entities: p.command.edits.map((e) => e.entity),
        mode,
        phase: "prepared",
      };
      await this.persist(record); // No execute if LocalStorage fails.
      return await this.deliver(p.session, false);
    } catch (e) {
      return { kind: "rejected", error: asError(e) };
    } finally {
      this.busy = false;
      this.changed();
    }
  }
  async recover(session: Session, confirmReplay?: () => Promise<void>): Promise<Outcome> {
    if (this.busy)
      return {
        kind: "pending",
        phase: this.record?.phase ?? "prepared",
        error: new Error("A submission is already running."),
      };
    this.busy = true;
    this.generation++;
    this.changed();
    try {
      await this.restore();
      return this.record ? await this.deliver(session, true, confirmReplay) : { kind: "no-change" };
    } catch (e) {
      return { kind: "pending", phase: this.record?.phase ?? "prepared", error: asError(e) };
    } finally {
      this.busy = false;
      this.changed();
    }
  }
  private async deliver(session: Session, recovery: boolean, confirmReplay?: () => Promise<void>): Promise<Outcome> {
    let r = this.record!;
    const attempt: { phase: SubmitPhase } = { phase: "checking" };
    let confirmed = ["readable", "committed", "recovering"].includes(r.phase);
    const p = { session, command: r.command };
    try {
      if (session.libraryId !== r.libraryId)
        throw new Failure("LIBRARY_MISMATCH", "Restore the original library to check this submission.");
      if (r.phase === "blocked")
        throw new Failure(
          "CORRUPT",
          "ME could not verify this command. The record is kept; contact support before clearing it.",
        );
      // After a valid receipt only reads are retried, never a second save.
      if (r.phase !== "committed")
        await this.api.submit(p, 10000, {
          phase: async (next) => {
            attempt.phase = next;
            if (next === "readable" || next === "committed" || next === "recovering") confirmed = true;
            if (next !== "checking") {
              // Once known committed, an unavailable replay receipt cannot erase that fact.
              r = { ...r, phase: next === "execute" && confirmed ? r.phase : next };
              await this.persist(r);
            }
          },
          // New intents preflight before persistence. Recovery delivers the frozen intent:
          // applying current heads here would overwrite concurrent work, and rejecting
          // stale heads here would strand the pending record forever.
          beforeReplay: recovery ? confirmReplay : undefined,
        });
    } catch (e) {
      const error = asError(e),
        code = e instanceof Failure ? e.code : "";
      if (blocked.has(code)) {
        r = { ...r, phase: "blocked" };
        try {
          await this.persist(r);
        } catch {
          /* Keep original durable intent. */
        }
      }
      if (confirmed && attempt.phase === "committed") return { kind: "committed-read-failed", error };
      if (!confirmed && attempt.phase === "execute" && rejected.has(code)) {
        try {
          await this.clear();
        } catch {
          return { kind: "pending", phase: r.phase, error };
        }
        return { kind: "rejected", error };
      }
      return { kind: "pending", phase: r.phase, error };
    }
    try {
      await this.api.submissionSession(p);
      const entities = await Promise.all(r.entities.map((id) => this.api.getBookmark(session, id)));
      let sync = "Sync status unavailable; refresh to check.";
      try {
        sync = statusText(await this.api.status(session));
      } catch {
        /* Local commit is already confirmed. */
      }
      await this.clear();
      const problem = entities.some(
        (e) =>
          e.purged ||
          e.values.life !== (r.command.edits.find((edit) => edit.entity === e.id)?.values.life ?? "active") ||
          e.structural.length ||
          Object.keys(e.conflicts).length,
      );
      return { kind: problem ? "committed-conflict" : "committed", entities, sync };
    } catch (e) {
      return { kind: "committed-read-failed", error: asError(e) };
    }
  }
}
