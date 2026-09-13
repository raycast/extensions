import os from "node:os";
import path from "node:path";
import fsp from "node:fs/promises";
import { createReadPool } from "./bounded-reads";

const read = createReadPool(1);
export function standardPathCandidates(home = os.homedir()) {
  return [
    home,
    ...["Desktop", "Documents", "Downloads"].map((name) =>
      path.join(home, name),
    ),
    path.join(home, "Library", "Mobile Documents", "com~apple~CloudDocs"),
  ].map((path) => ({ path }));
}

/** Cloud-provider discovery has its own deadline and retains stalled read slots. */
export async function cloudPathCandidates(
  signal: AbortSignal,
  home = os.homedir(),
  budgetMs = 1000,
) {
  const active = new AbortController();
  const stop = () => active.abort();
  signal.addEventListener("abort", stop, { once: true });
  if (signal.aborted) stop();
  const timer = setTimeout(stop, budgetMs);
  const root = path.join(home, "Library", "CloudStorage");
  try {
    const names = await read(root, () => fsp.readdir(root), active.signal);
    return {
      paths: names
        .filter((name) => !name.startsWith("."))
        .map((name) => ({ path: path.join(root, name) })),
      partial: false,
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return { paths: [], partial: !["ENOENT", "ENOTDIR"].includes(code ?? "") };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", stop);
  }
}
