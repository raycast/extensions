import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DAY, Observation, RETENTION } from "./usageModel";

/** Immutable sample files avoid lost updates when foreground and background commands overlap. */
export class HistoryStore {
  constructor(private readonly directory: string) {}

  async append(observations: Observation[], now = Date.now()): Promise<void> {
    if (!observations.length) return;
    const day = Math.floor(now / DAY);
    const directory = join(this.directory, String(day));
    await mkdir(directory, { recursive: true });
    const name = `${now}-${randomUUID()}`;
    const temporary = join(directory, `${name}.tmp`);
    await writeFile(temporary, JSON.stringify(observations), { mode: 0o600 });
    await rename(temporary, join(directory, `${name}.json`));
    // Only old day folders are removed; active writers always use today's directory.
    const oldest = Math.floor((now - RETENTION) / DAY);
    for (const entry of await readdir(this.directory)) {
      if (/^\d+$/.test(entry) && Number(entry) < oldest)
        await rm(join(this.directory, entry), { recursive: true, force: true });
    }
  }

  async read(now = Date.now()): Promise<Observation[]> {
    let days: string[];
    try {
      days = await readdir(this.directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const records: Observation[] = [];
    for (const day of days.filter((d) => /^\d+$/.test(d) && Number(d) >= Math.floor((now - RETENTION) / DAY))) {
      const directory = join(this.directory, day);
      let names: string[];
      try {
        names = await readdir(directory);
      } catch {
        continue;
      }
      for (const name of names.filter((n) => n.endsWith(".json"))) {
        try {
          const values: unknown = JSON.parse(await readFile(join(directory, name), "utf8"));
          if (Array.isArray(values))
            records.push(...values.filter((o): o is Observation => valid(o) && o.at >= now - RETENTION && o.at <= now));
        } catch {
          // A malformed or concurrently pruned file doesn't erase the rest of the history.
        }
      }
    }
    return records.sort((a, b) => a.at - b.at);
  }
}

function valid(value: unknown): value is Observation {
  if (!value || typeof value !== "object") return false;
  const o = value as Observation;
  return (
    typeof o.account === "string" &&
    typeof o.provider === "string" &&
    typeof o.label === "string" &&
    Number.isFinite(o.at) &&
    Number.isFinite(o.left) &&
    o.left >= 0 &&
    o.left <= 100 &&
    (o.resetsAt === null || Number.isFinite(o.resetsAt))
  );
}
