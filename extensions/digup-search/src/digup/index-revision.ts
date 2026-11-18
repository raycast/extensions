import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { Launch } from "./installation";

/** SQLite commits can change the WAL before the database file changes. Check both indexes and their WAL files. */
export async function indexRevision(launch: Launch): Promise<string | undefined> {
  const flag = launch.args.indexOf("--index");
  const directory = flag >= 0 ? launch.args[flag + 1] : undefined;
  if (!directory) return undefined;
  const files = ["index.sqlite", "index.sqlite-wal", "code.sqlite", "code.sqlite-wal"];
  const revisions = await Promise.all(
    files.map(async (name) => {
      try {
        const info = await stat(join(directory, name), { bigint: true });
        return `${name}:${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT") return `${name}:missing`;
        throw error;
      }
    }),
  );
  return revisions.join("|");
}
