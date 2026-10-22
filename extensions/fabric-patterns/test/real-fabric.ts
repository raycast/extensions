import { existsSync } from "node:fs";

// Real fabric reads its own .env and config, so every test that runs it is opt-in:
// `FABRIC_REAL=1 bun test`. test/real-fabric.test.ts checks that each direct use (runFabric or
// fabricPath given REAL or a Homebrew path) sits behind RUN_REAL; it can't see an indirect one,
// so test/spawn-guard.ts refuses those at spawn time.
export const REAL = "/opt/homebrew/bin/fabric";

/** Asked for real fabric but it isn't there: fail, so the real tests can't pass by skipping. */
export function realGate(env: NodeJS.ProcessEnv, installed: boolean): boolean {
  if (env.FABRIC_REAL !== "1") return false;
  if (!installed) throw new Error(`FABRIC_REAL=1 but ${REAL} is missing; install fabric or unset FABRIC_REAL`);
  return true;
}

export const RUN_REAL = realGate(process.env, existsSync(REAL));
