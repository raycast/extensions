import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DiagnosticConfig, parsePreferences } from "./proxy-core";

export const SNAPSHOT_PATH = path.join(
  homedir(),
  ".local",
  "state",
  "raycast-ssh-proxy-router",
  "diagnostic-config.json",
);

export function validateSnapshot(value: unknown): DiagnosticConfig {
  if (!value || typeof value !== "object") throw new Error("Invalid diagnostic snapshot.");
  const input = value as Record<string, unknown>;
  if (input.schemaVersion !== 1)
    throw new Error("Unsupported diagnostic snapshot version; refresh the router in Raycast.");
  if (
    !Array.isArray(input.routedHosts) ||
    !input.routedHosts.length ||
    !input.routedHosts.every(
      (rule) => rule && typeof rule === "object" && typeof rule.host === "string" && typeof rule.wildcard === "boolean",
    )
  )
    throw new Error("Invalid snapshot host rules.");
  if (
    !Array.isArray(input.networkServices) ||
    !input.networkServices.length ||
    !input.networkServices.every((service) => typeof service === "string" && service.trim().length > 0)
  )
    throw new Error("Invalid snapshot network services.");
  if (typeof input.primaryURL !== "string" || typeof input.socksPort !== "number" || typeof input.pacPort !== "number")
    throw new Error("Invalid snapshot URL or ports.");
  const url = new URL(input.primaryURL);
  if (url.username || url.password) throw new Error("Diagnostic snapshots must not contain URL credentials.");
  const config = parsePreferences({
    sshUser: "",
    sshHost: "",
    sshPort: "22",
    routedHosts: input.routedHosts.map((rule) => `${rule.wildcard ? "*." : ""}${rule.host}`).join(","),
    primaryURL: input.primaryURL,
    socksPort: String(input.socksPort),
    pacPort: String(input.pacPort),
    startTimeout: "15",
    openInSafari: false,
  });
  if (JSON.stringify(config.routedHosts) !== JSON.stringify(input.routedHosts))
    throw new Error("Snapshot host rules must be normalized and unique.");
  return {
    schemaVersion: 1,
    routedHosts: config.routedHosts,
    primaryURL: config.primaryURL,
    socksPort: config.socksPort,
    pacPort: config.pacPort,
    networkServices: [...new Set(input.networkServices)],
  };
}

export async function readSnapshot(file = SNAPSHOT_PATH): Promise<DiagnosticConfig> {
  try {
    return validateSnapshot(JSON.parse(await fs.readFile(file, "utf8")));
  } catch (error) {
    throw new Error(
      `Cannot load diagnostic snapshot: ${error instanceof Error ? error.message : String(error)}. Start the updated extension or refresh its healthy menu-bar status once in Raycast.`,
    );
  }
}

export async function writeSnapshot(config: DiagnosticConfig, file = SNAPSHOT_PATH): Promise<void> {
  const text = `${JSON.stringify(validateSnapshot(config), null, 2)}\n`;
  try {
    if ((await fs.readFile(file, "utf8")) === text) return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, text, { mode: 0o600, flag: "wx" });
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}
