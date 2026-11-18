import { execFile } from "child_process";
import { promisify } from "util";
import { locateCli } from "./cli";

const execFileAsync = promisify(execFile);

/** A compression preset row, mirrored from `presets list --json`. */
export interface Preset {
  id: string;
  name: string;
  kind: "image" | "audio" | "video";
  source: "built-in" | "custom";
  description: string;
}

/**
 * Fetch compression presets via `picmal-cli presets list --json`. The command
 * emits a single `completed` NDJSON line with a `presets` array. Returns an
 * empty list if the CLI can't be reached (the form's preset picker is optional).
 */
export async function loadPresets(): Promise<Preset[]> {
  let cli: string;
  try {
    cli = locateCli();
  } catch {
    return [];
  }

  try {
    const { stdout } = await execFileAsync(cli, ["presets", "list", "--json"], { encoding: "utf8" });
    for (const line of stdout.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("{")) continue;
      const event = JSON.parse(trimmed) as { event?: string; presets?: Preset[] };
      if (event.event === "completed" && event.presets) {
        return event.presets;
      }
    }
  } catch {
    // fall through to []
  }
  return [];
}
