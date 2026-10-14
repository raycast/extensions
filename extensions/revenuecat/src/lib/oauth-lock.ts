import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { lock } from "proper-lockfile";
import type { TokenLock } from "./oauth-core";

// Every command uses the same extension support directory. Only lock metadata
// touches disk; credentials remain in Raycast's OAuth token storage.
export function createTokenLock(supportPath: string): TokenLock {
  return async (task) => {
    await mkdir(supportPath, { recursive: true });
    let compromised: Error | undefined;
    const release = await lock(join(supportPath, "revenuecat-oauth"), {
      realpath: false,
      stale: 30000,
      update: 5000,
      retries: { retries: 80, minTimeout: 500, maxTimeout: 500 },
      onCompromised: (error) => {
        compromised = error;
      },
    });
    const assertHeld = () => {
      if (compromised) throw new Error("RevenueCat authentication is busy. Try again.");
    };
    try {
      return await task(assertHeld);
    } finally {
      if (!compromised) await release();
    }
  };
}
