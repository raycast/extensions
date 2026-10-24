import { realpathSync } from "node:fs";

// The runtime half of the real-fabric gate. test/real-fabric.test.ts reads the source, so it can't
// see a path built at runtime or src falling back to DEFAULT_FABRIC_PATH; this refuses the spawn
// itself. Bun's node:child_process starts every process through Bun.spawn or Bun.spawnSync, so the
// preload wraps those two (test/spawn-guard.test.ts proves each child_process entry point is seen).
// A refusal throws, and child_process or src may catch it (spawnSync returns it as `.error`), so
// each one is also recorded and the preload's afterEach fails the test that made it. A bun
// subprocess a test starts doesn't load the preload, so nothing it spawns is seen here; nor is
// Bun.$, which doesn't go through Bun.spawn (nothing in the repo uses it).

const HOMEBREW_FABRIC =
  /(?:^|[^\w./-])\/(?:opt\/homebrew|usr\/local)\/(?:bin\/fabric(?:-ai)?(?![\w.-])|(?:Cellar|opt)\/fabric(?:-ai)?\/)/;

/** A Homebrew fabric path, as written or once its symlinks are resolved. */
export function isRealFabric(s: string): boolean {
  if (HOMEBREW_FABRIC.test(s)) return true;
  if (!s.startsWith("/")) return false;
  try {
    // A missing path throws (ENOENT): not fabric.
    return HOMEBREW_FABRIC.test(realpathSync(s));
  } catch {
    return false;
  }
}

const refusals: string[] = [];

/** Empties the record; the preload's afterEach fails the test when this returns anything. */
export function takeRefusals(): string[] {
  return refusals.splice(0);
}

/** The first real-fabric string a spawn would run: the command (looked up on PATH when it names no directory, as plain `fabric` is) or any argument. */
export function realFabricIn(cmd: unknown[], path = process.env.PATH): string | undefined {
  const [first] = cmd;
  const found = typeof first === "string" && first && !first.includes("/") ? Bun.which(first, { PATH: path }) : null;
  return (found ? [found, ...cmd] : cmd).find((s): s is string => typeof s === "string" && isRealFabric(s));
}

/** Wraps Bun.spawn and Bun.spawnSync, which take `cmd` as an array or inside an options object. */
export function guardBun(bun: typeof Bun) {
  for (const name of ["spawn", "spawnSync"] as const) {
    const f = bun[name] as (...a: unknown[]) => unknown;
    (bun as Record<string, unknown>)[name] = (a: unknown, ...rest: unknown[]) => {
      const opts = (Array.isArray(a) ? rest[0] : a) as { cmd?: unknown[]; env?: { PATH?: string } } | undefined;
      const cmd = Array.isArray(a) ? a : opts?.cmd;
      const hit = realFabricIn(Array.isArray(cmd) ? cmd : [], opts?.env?.PATH ?? process.env.PATH);
      if (hit !== undefined) {
        const msg = `Bun.${name}(${hit}) refused: real fabric runs only under FABRIC_REAL=1 (test/real-fabric.ts)`;
        refusals.push(msg);
        throw new Error(msg);
      }
      return f(a, ...rest);
    };
  }
}
