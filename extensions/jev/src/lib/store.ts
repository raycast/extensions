import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import lockfile from "proper-lockfile";
import { dataSchema, initialData, type Data } from "./model";

const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
export function parseBackup(text: string): Data {
  if (Buffer.byteLength(text) > MAX_BACKUP_BYTES) throw new Error("Choose a Jev backup smaller than 50 MB.");
  try {
    const raw = JSON.parse(text);
    if (raw.format === "jev-backup" && raw.version !== 1) throw new Error("Unsupported backup version");
    return dataSchema.parse(raw.format === "jev-backup" ? raw.data : raw);
  } catch {
    throw new Error("This is not a valid Jev backup. Your current data has not changed.");
  }
}
export async function readBackup(file: string) {
  if ((await fs.stat(file)).size > MAX_BACKUP_BYTES) throw new Error("Choose a Jev backup smaller than 50 MB.");
  return parseBackup(await fs.readFile(file, "utf8"));
}

export class Store {
  constructor(readonly directory: string) {}
  get file() {
    return path.join(this.directory, "jev-data.json");
  }
  get backupsDirectory() {
    return path.join(this.directory, "backups");
  }
  async read(): Promise<Data> {
    try {
      return dataSchema.parse(JSON.parse(await fs.readFile(this.file, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        if (!(await this.listBackups()).length) return initialData();
        throw new Error(
          "Jev's current data file is missing. Recovery copies are available in Backup and Restore; your library has not been reset.",
        );
      }
      throw new Error(
        "Jev could not read its saved data. Your saved data was not replaced. Open Backup and Restore to recover a previous version.",
      );
    }
  }
  private async locked<T>(file: string, fn: (assertOwned: () => void) => Promise<T>, legacy = false): Promise<T> {
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    let compromised: Error | undefined;
    let release: () => Promise<void>;
    try {
      release = await lockfile.lock(file, {
        realpath: false,
        stale: 10000,
        update: 2000,
        retries: { retries: 60, minTimeout: 250, maxTimeout: 250 },
        ...(legacy ? { lockfilePath: path.join(this.directory, ".write-lock") } : {}),
        onCompromised: (error) => {
          compromised = error;
        },
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ELOCKED")
        throw new Error(
          "Another Jev operation is still running. Wait for it to finish, then retry. Interrupted operations recover automatically.",
        );
      throw error;
    }
    const assertOwned = () => {
      if (compromised)
        throw new Error(
          "The operation was interrupted. Reopen Jev and retry; your previous data is protected by a backup.",
        );
    };
    try {
      return await fn(assertOwned);
    } finally {
      if (!compromised) await release();
    }
  }
  async withFileOperations<T>(fn: () => Promise<T>) {
    return this.locked(path.join(this.directory, "file-operations"), async (assertOwned) => {
      assertOwned();
      const result = await fn();
      assertOwned();
      return result;
    });
  }
  private async write(data: Data, assertOwned: () => void) {
    const temp = this.file + `.${randomUUID()}.tmp`;
    try {
      const handle = await fs.open(temp, "wx", 0o600);
      try {
        await handle.writeFile(JSON.stringify(data, null, 2));
        await handle.sync();
      } finally {
        await handle.close();
      }
      assertOwned();
      await fs.rename(temp, this.file);
    } finally {
      await fs.rm(temp, { force: true });
    }
  }
  private async snapshot(raw: string, reason: string) {
    await fs.mkdir(this.backupsDirectory, { recursive: true, mode: 0o700 });
    const file = path.join(
      this.backupsDirectory,
      `${new Date().toISOString().replace(/[:.]/g, "-")}-${reason}-${randomUUID()}.json`,
    );
    const handle = await fs.open(file, "wx", 0o600);
    try {
      await handle.writeFile(raw);
      await handle.sync();
    } finally {
      await handle.close();
    }
    return file;
  }
  private async pruneAutomaticBackups() {
    const files = (await fs.readdir(this.backupsDirectory))
      .filter((f) => f.includes("-automatic-"))
      .sort()
      .reverse();
    await Promise.all(files.slice(10).map((f) => fs.rm(path.join(this.backupsDirectory, f), { force: true })));
  }
  async update(change: (data: Data) => void | Promise<void>): Promise<Data> {
    return this.locked(
      this.file,
      async (assertOwned) => {
        const data = await this.read();
        const before = JSON.stringify(data, null, 2);
        await change(data);
        const valid = dataSchema.parse(data);
        assertOwned();
        await this.snapshot(before, "automatic");
        await this.write(valid, assertOwned);
        // Retention failure must not report a completed save as a failure.
        await this.pruneAutomaticBackups().catch(() => {});
        return valid;
      },
      true,
    );
  }
  async listBackups() {
    try {
      return (await fs.readdir(this.backupsDirectory))
        .filter((f) => f.endsWith(".json"))
        .sort()
        .reverse()
        .map((name) => ({ name, path: path.join(this.backupsDirectory, name) }));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }
  async exportBackup(folder: string) {
    const data = await this.read();
    const content = JSON.stringify(
      { format: "jev-backup", version: 1, createdAt: new Date().toISOString(), data },
      null,
      2,
    );
    const file = path.join(
      folder,
      `jev-backup-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}.json`,
    );
    await fs.writeFile(file, content, { flag: "wx", mode: 0o600 });
    return file;
  }
  async restore(input: Data) {
    const backup = dataSchema.parse(structuredClone(input));
    return this.withFileOperations(() =>
      this.locked(
        this.file,
        async (assertOwned) => {
          let raw: string | undefined;
          try {
            raw = await fs.readFile(this.file, "utf8");
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          }
          let moves: Data["moves"] = [];
          if (raw !== undefined) {
            // Keep an exact copy even if the current file cannot be parsed.
            await this.snapshot(raw, "before-restore");
            try {
              moves = dataSchema.parse(JSON.parse(raw)).moves;
            } catch {
              /* Corrupt history is not trusted. */
            }
          }
          const next = { ...backup, moves };
          await this.write(next, assertOwned);
          return next;
        },
        true,
      ),
    );
  }
}
