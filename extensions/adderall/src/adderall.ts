import { existsSync } from "node:fs";
import { homedir } from "node:os";

export const INSTALL_HINT = "Install: brew install carlos-err406/tap/adderall";

/**
 * Resolve the `adderall` binary across install methods (Raycast runs with a
 * minimal PATH, so check common locations explicitly). Returns null if not found.
 */
export function adderallBin(): string | null {
  const candidates = [
    `${homedir()}/.local/bin/adderall`,
    "/opt/homebrew/bin/adderall",
    "/usr/local/bin/adderall",
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}
