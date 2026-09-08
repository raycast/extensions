import fs from "node:fs/promises";
import { createReadPool } from "./bounded-reads";

const read = createReadPool(8);

/** Cancellation detaches callers, while physical reads stay bounded across retries. */
export function driveReads(budgetMs: number, signal?: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted || budgetMs <= 0) abort();
  const timer = setTimeout(abort, Math.max(0, budgetMs));
  const check = () => {
    if (controller.signal.aborted) throw new Error("Drive scan stopped");
  };
  return {
    check,
    get stopped() {
      return controller.signal.aborted;
    },
    readdir: (full: string) =>
      read(
        "dir:" + full,
        () => fs.readdir(full, { withFileTypes: true }),
        controller.signal,
      ),
    stat: (full: string) =>
      read("stat:" + full, () => fs.stat(full), controller.signal),
    readlink: (full: string) =>
      read("link:" + full, () => fs.readlink(full), controller.signal),
    dispose: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    },
  };
}

export type DriveReads = ReturnType<typeof driveReads>;
