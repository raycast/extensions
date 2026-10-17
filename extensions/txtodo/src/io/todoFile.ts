import { watch as fsWatch } from "node:fs";
import { appendFile, writeFile as fsWriteFile, readFile, rename, stat } from "node:fs/promises";
import { parseLine, serializeTask, type Task } from "../domain/parser";

export type FileSnapshot = {
  path: string;
  mtimeMs: number;
  tasks: Task[];
  raw: string;
};

export async function read(path: string): Promise<FileSnapshot | "notfound"> {
  let st: Awaited<ReturnType<typeof stat>>;
  try {
    st = await stat(path);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return "notfound";
    throw err;
  }

  const raw = await readFile(path, "utf8");
  const tasks: Task[] = [];
  let lineNumber = 0;
  for (const line of raw.split("\n")) {
    if (line.trim().length === 0) continue;
    tasks.push(parseLine(line, lineNumber));
    lineNumber++;
  }

  return { path, mtimeMs: st.mtimeMs, tasks, raw };
}

export type WriteResult = { kind: "ok"; snapshot: FileSnapshot } | { kind: "conflict"; fresh: FileSnapshot };

export async function writeAtomic(snapshot: FileSnapshot, nextTasks: Task[]): Promise<WriteResult> {
  if (snapshot.mtimeMs > 0) {
    try {
      const current = await stat(snapshot.path);
      if (current.mtimeMs !== snapshot.mtimeMs) {
        const fresh = await read(snapshot.path);
        if (fresh === "notfound") {
          return {
            kind: "conflict",
            fresh: { path: snapshot.path, mtimeMs: 0, tasks: [], raw: "" },
          };
        }
        return { kind: "conflict", fresh };
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  const body = nextTasks.map(serializeTask).join("\n") + (nextTasks.length > 0 ? "\n" : "");
  const tmp = `${snapshot.path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 10)}`;
  await fsWriteFile(tmp, body, "utf8");
  await rename(tmp, snapshot.path);

  const st = await stat(snapshot.path);
  return {
    kind: "ok",
    snapshot: {
      path: snapshot.path,
      mtimeMs: st.mtimeMs,
      tasks: nextTasks.map((t, i) => ({ ...t, lineNumber: i })),
      raw: body,
    },
  };
}

const DEBOUNCE_MS = 150;

export function watch(path: string, onChange: () => void): () => void {
  let timer: NodeJS.Timeout | undefined;
  let disposed = false;

  const watcher = fsWatch(path, { persistent: false }, () => {
    if (disposed) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (!disposed) onChange();
    }, DEBOUNCE_MS);
  });

  return () => {
    disposed = true;
    if (timer) clearTimeout(timer);
    watcher.close();
  };
}

export async function appendToDone(path: string, tasks: Task[]): Promise<void> {
  if (tasks.length === 0) return;
  const body = `${tasks.map(serializeTask).join("\n")}\n`;
  await appendFile(path, body, "utf8");
}
