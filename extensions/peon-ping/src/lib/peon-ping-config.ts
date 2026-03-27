import { existsSync, readFileSync } from "node:fs";

export type PeonPingStatus = {
  enabled: boolean;
};

export function getPeonPingStatus(
  configFilePath: string,
  pausedFilePath: string,
): PeonPingStatus {
  const raw = readFileSync(configFilePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error("peon-ping config is missing boolean enabled");
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.enabled !== "boolean") {
    throw new Error("peon-ping config is missing boolean enabled");
  }
  const paused = existsSync(pausedFilePath);
  return { enabled: o.enabled && !paused };
}
