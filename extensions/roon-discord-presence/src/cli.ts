import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Output of `roon-discord-presence status --json` (schema 1, see docs/status-json.md). */
export interface Status {
  schema: number;
  service: "running" | "stopped";
  state: "stopped" | "starting" | "approve" | "roon-offline" | "idle" | "playing";
  roon?: "ok" | "approve" | "offline";
  core?: string | null;
  discord?: boolean;
  covers?: "none" | "s3" | "command";
  playing?: { zone: string; title: string; artist: string; album: string; cover: string | null } | null;
  shown?: boolean;
  zones?: { name: string; state: string }[];
  updated?: number;
}

export class CliNotFoundError extends Error {
  constructor() {
    super("roon-discord-presence is not installed");
  }
}

export const LOG_FILE = join(homedir(), "Library/Logs/roon-discord-presence/roon-discord-presence.log");
export const INSTALL_HINT = "uv tool install 'roon-discord-presence[s3]' && roon-discord-presence setup";

function findCli(): string {
  const { cliPath } = getPreferenceValues<Preferences>();
  const candidates = [
    cliPath?.trim(),
    join(homedir(), ".local/bin/roon-discord-presence"),
    "/opt/homebrew/bin/roon-discord-presence",
    "/usr/local/bin/roon-discord-presence",
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const path = candidate.replace(/^~(?=\/)/, homedir());
    try {
      accessSync(path, constants.X_OK);
      return path;
    } catch {
      // try the next one
    }
  }
  throw new CliNotFoundError();
}

export async function getStatus(): Promise<Status> {
  const { stdout } = await execFileAsync(findCli(), ["status", "--json"], { timeout: 10_000 });
  return JSON.parse(stdout) as Status;
}

/** Runs start/stop/restart and returns the CLI's last output line, e.g. "Restarted". */
export async function control(command: "start" | "stop" | "restart"): Promise<string> {
  try {
    const { stdout } = await execFileAsync(findCli(), [command], { timeout: 30_000 });
    return stdout.trim().split("\n").pop() ?? "";
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim();
    throw new Error(stderr || (error as Error).message);
  }
}

/** One-line title and subtitle, shared by the menu bar and the list view. */
export function summarize(status: Status): { title: string; subtitle: string } {
  const extras: string[] = [];
  if (status.service === "running" && status.state !== "starting") {
    extras.push(status.discord ? "Discord connected" : "waiting for Discord");
    if (status.covers === "none") extras.push("covers off");
  }
  const tail = extras.length ? " · " + extras.join(" · ") : "";

  if (status.state === "playing" && status.playing) {
    const p = status.playing;
    return {
      title: `${p.title} — ${p.artist}`,
      subtitle: `${p.album} · ${p.zone} · ${status.shown ? "shown on Discord" : "updating Discord…"}`,
    };
  }
  const summaries: Record<Status["state"], [string, string]> = {
    stopped: ["Off", "Not running and won't start at login"],
    starting: ["Starting…", "Waiting for the service to report in"],
    approve: ["Waiting for Roon approval", "Enable “Discord Presence” in Roon → Settings → Extensions"],
    "roon-offline": ["Can't reach Roon Core", "Check [roon] host/port in the config" + tail],
    idle: ["Nothing playing", "Running" + tail],
    playing: ["Playing", "Running" + tail],
  };
  const [title, subtitle] = summaries[status.state] ?? [status.state, ""];
  return { title, subtitle };
}
