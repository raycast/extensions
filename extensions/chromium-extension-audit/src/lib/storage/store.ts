import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import lockfile from "proper-lockfile";
import { AuditStore, emptyStore, Scan, StoreSchema } from "../model";
import { missing } from "../chromium/files";
import { reconcile } from "../monitoring/reconcile";

export class StorageRecoveryError extends Error {
  constructor() {
    super(
      "The saved audit is missing, corrupt, or uses an unsupported schema. Reset the baseline to recreate it; no change history will be inferred.",
    );
  }
}
export class AuditRepository {
  constructor(readonly directory: string) {}
  private get filename() {
    return path.join(this.directory, "audit.json");
  }
  async read(): Promise<AuditStore> {
    try {
      return StoreSchema.parse(JSON.parse(await fs.readFile(this.filename, "utf8")));
    } catch (error) {
      if (!missing(error)) {
        if ((error as NodeJS.ErrnoException).code) throw error;
        throw new StorageRecoveryError();
      }
      try {
        await fs.access(path.join(this.directory, "initialized"));
      } catch (markerError) {
        if (missing(markerError)) return emptyStore();
        throw markerError;
      }
      throw new StorageRecoveryError();
    }
  }
  private async write(state: AuditStore): Promise<void> {
    const data = JSON.stringify(StoreSchema.parse(state));
    const temporary = path.join(this.directory, `audit-${randomUUID()}.tmp`);
    try {
      const handle = await fs.open(temporary, "wx", 0o600);
      try {
        await handle.writeFile(data);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await fs.rename(temporary, this.filename);
      await fs.writeFile(path.join(this.directory, "initialized"), "1", { mode: 0o600 });
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }
  private async transaction(update: (state: AuditStore) => Promise<AuditStore>, reset = false): Promise<AuditStore> {
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    let compromised = false;
    const release = await lockfile.lock(path.join(this.directory, "audit"), {
      realpath: false,
      stale: 30000,
      update: 5000,
      retries: { retries: 60, minTimeout: 100, maxTimeout: 500 },
      onCompromised: () => {
        compromised = true;
      },
    });
    try {
      const state = reset ? emptyStore() : await this.read();
      const next = await update(state);
      if (compromised) throw new Error("Audit storage lock was lost; scan was not saved. Try again.");
      if (reset) {
        try {
          await fs.copyFile(this.filename, path.join(this.directory, "audit-before-reset.json"));
        } catch (error) {
          if (!missing(error)) throw error;
        }
      }
      await this.write(next);
      return StoreSchema.parse(JSON.parse(JSON.stringify(next)));
    } finally {
      if (!compromised) await release();
    }
  }
  scan(scanner: () => Promise<Scan>, monitoring = false): Promise<AuditStore> {
    return this.transaction(async (state) => {
      const scan = await scanner();
      const next = reconcile(state, scan);
      if (monitoring) next.monitoringLastRun = scan.at;
      return next;
    });
  }
  review(ids: string[]): Promise<AuditStore> {
    return this.transaction(async (state) => {
      const selected = new Set(ids);
      const now = new Date().toISOString();
      return {
        ...state,
        revision: state.revision + 1,
        events: state.events.map((e) => (selected.has(e.id) ? { ...e, reviewedAt: e.reviewedAt ?? now } : e)),
      };
    });
  }
  reset(): Promise<AuditStore> {
    return this.transaction(async () => emptyStore(), true);
  }
}
