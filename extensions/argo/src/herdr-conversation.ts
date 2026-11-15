import { createHash } from "node:crypto";
import { hcReplyText } from "./herdr-output.js";

export type HcTurn = {
  id: string;
  text: string;
  output: string;
  at: number;
  state: "submitting" | "submitted" | "working" | "blocked" | "done" | "unknown" | "rejected" | "paused";
  isolated: boolean;
};
type Observation = { text: string; state?: string; turn?: number; complete: boolean; stable?: boolean };
type Store = { getItem(key: string): Promise<unknown>; setItem(key: string, value: string): Promise<void> };
const states = new Set(["submitting", "submitted", "working", "blocked", "done", "unknown", "rejected", "paused"]);

// Serialize read/merge/write across all views of the same durable history key.
const historyWrites = new Map<string, Promise<void>>();
function decodeTurns(raw: unknown): HcTurn[] {
  if (raw === undefined) return [];
  if (typeof raw !== "string" || raw.length > 1_500_000) throw new Error("Saved conversation is too large.");
  const value: unknown = JSON.parse(raw);
  if (
    !Array.isArray(value) ||
    value.length > 40 ||
    new Set(value.map((t) => t?.id)).size !== value.length ||
    value.some(
      (t) =>
        !t ||
        typeof t.id !== "string" ||
        t.id.length > 200 ||
        typeof t.text !== "string" ||
        t.text.length > 100_000 ||
        typeof t.output !== "string" ||
        t.output.length > 100_000 ||
        !Number.isSafeInteger(t.at) ||
        !states.has(t.state) ||
        typeof t.isolated !== "boolean",
    )
  )
    throw new Error("Cannot read saved conversation.");
  return value as HcTurn[];
}
function bounded(turns: HcTurn[]): HcTurn[] {
  turns = turns.slice(-40);
  while (
    turns.length > 1 &&
    (turns.reduce((n, t) => n + t.text.length + t.output.length, 0) > 500_000 ||
      JSON.stringify(turns).length > 1_500_000)
  )
    turns.shift();
  return turns;
}

// Local reconstructed turns, not a native Agent transcript. Raw screen baselines remain in memory only.
export class HcConversation {
  readonly storageKey: string;
  turns: HcTurn[] = [];
  ready = false;
  error?: string;
  private active?: { id: string; before: Observation; working: boolean };
  private writes: Promise<void> = Promise.resolve();
  private owned = new Set<string>();
  constructor(
    key: string,
    program: string,
    private storage: Store,
    private changed: () => void = () => {},
  ) {
    this.storageKey = `hc-conversation-v1:${createHash("sha256")
      .update(JSON.stringify([key, program]))
      .digest("hex")}`;
  }
  async load() {
    try {
      const raw = await this.storage.getItem(this.storageKey);
      this.turns = decodeTurns(raw).map((t) => ({
        ...t,
        state:
          t.state === "submitting"
            ? "unknown"
            : ["submitted", "working", "blocked"].includes(t.state)
              ? "paused"
              : t.state,
      }));
      this.ready = true;
    } catch {
      this.error =
        "Cannot restore local message history. Raw terminal controls and saved input safeguards remain available.";
    }
    this.changed();
  }
  private save(changed: HcTurn[]) {
    const updates = changed.map((turn) => ({ ...turn }));
    const write = (historyWrites.get(this.storageKey) ?? Promise.resolve())
      .catch(() => {})
      .then(async () => {
        const latest = decodeTurns(await this.storage.getItem(this.storageKey));
        const merged = new Map(latest.map((turn) => [turn.id, turn]));
        for (const turn of updates) merged.set(turn.id, turn);
        const saved = bounded([...merged.values()]);
        await this.storage.setItem(this.storageKey, JSON.stringify(saved));
        // Keep not-yet-written local edits, but never overlay stale copies owned by another view.
        const current = new Map(this.turns.filter((turn) => this.owned.has(turn.id)).map((turn) => [turn.id, turn]));
        this.turns = bounded(
          saved
            .map((turn) => current.get(turn.id) ?? turn)
            .concat([...current.values()].filter((turn) => !merged.has(turn.id))),
        );
        this.changed();
      });
    historyWrites.set(this.storageKey, write);
    this.writes = write;
    void write
      .finally(() => {
        if (historyWrites.get(this.storageKey) === write) historyWrites.delete(this.storageKey);
      })
      .catch(() => {});
    void write.catch(() => {
      this.error =
        "Message history could not be saved. Delivery controls are unchanged; do not resend just to restore history.";
      this.changed();
    });
    this.changed();
    return write;
  }
  async refresh() {
    this.ready = false;
    this.active = undefined;
    await this.writes.catch(() => {});
    await (historyWrites.get(this.storageKey) ?? Promise.resolve()).catch(() => {});
    this.owned.clear();
    await this.load();
  }
  async begin(id: string, text: string, before: Observation) {
    if (!this.ready || this.error) throw new Error("Local message history is unavailable. Nothing was sent.");
    const changed: HcTurn[] = [];
    if (this.active) {
      const prior = this.turns.find((t) => t.id === this.active!.id);
      if (prior) {
        prior.state = "paused";
        changed.push(prior);
      }
    }
    const turn: HcTurn = { id, text, output: "", at: Date.now(), state: "submitting", isolated: true };
    this.owned.add(id);
    this.turns.push(turn);
    changed.push(turn);
    this.active = { id, before, working: false };
    try {
      await this.save(changed);
    } catch {
      this.active = undefined;
      turn.state = "rejected";
      throw new Error("Cannot save message history. Nothing was sent.");
    }
  }
  submitted(id: string) {
    const turn = this.turns.find((t) => t.id === id);
    if (turn) {
      turn.state = "submitted";
      void this.save([turn]).catch(() => {});
    }
  }
  failed(id: string, rejected: boolean) {
    const turn = this.turns.find((t) => t.id === id);
    if (!turn) return;
    turn.state = rejected ? "rejected" : "unknown";
    this.active = undefined;
    void this.save([turn]).catch(() => {});
  }
  observe(current: Observation) {
    const active = this.active;
    if (!active) return;
    const turn = this.turns.find((t) => t.id === active.id);
    if (!turn || turn.state === "submitting") return;
    // More than one new HC turn means another actor may have submitted input.
    if (active.before.turn !== undefined && current.turn !== undefined && current.turn > active.before.turn + 1) {
      turn.state = "paused";
      this.active = undefined;
      void this.save([turn]).catch(() => {});
      return;
    }
    if (!current.complete || current.stable === false) return;
    const result =
      active.before.complete && active.before.stable !== false
        ? hcReplyText(active.before.text, current.text, turn.text)
        : { text: "", isolated: false };
    const nextState = current.state === "working" ? "working" : current.state === "blocked" ? "blocked" : turn.state;
    active.working ||= current.state === "working";
    const ended =
      ["done", "idle"].includes(current.state || "") &&
      (active.working ||
        (current.turn !== undefined && active.before.turn !== undefined && current.turn > active.before.turn) ||
        (active.before.turn === undefined && current.turn === undefined && Boolean(result.text)));
    const output = result.isolated ? result.text.slice(0, 100_000) : "";
    const state = ended ? "done" : nextState;
    if (turn.output !== output || turn.isolated !== result.isolated || turn.state !== state) {
      turn.output = output;
      turn.isolated = result.isolated;
      turn.state = state;
      void this.save([turn]).catch(() => {});
    }
    if (ended) this.active = undefined;
  }
}
