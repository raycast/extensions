import { exec } from "child_process";
import { promisify } from "util";
import { Cache } from "@raycast/api";

const execAsync = promisify(exec);
const cache = new Cache();

export interface ArtisanCommand {
  name: string;
  description: string;
  usage: string;
  definition?: {
    arguments: Record<string, unknown>;
    options: Record<string, unknown>;
  };
  hidden?: boolean;
}

export async function getArtisanCommands(projectPath: string, refresh = false): Promise<ArtisanCommand[]> {
  const cacheKey = `artisan-commands-${projectPath}`;

  if (!refresh) {
    const cached = cache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
  }

  try {
    const { stdout } = await execAsync(`php artisan list --format=json`, {
      cwd: projectPath,
      maxBuffer: 1024 * 1024 * 5,
    });
    const parsed = JSON.parse(stdout);

    // The structure of Laravel's json output is { application: {...}, commands: [ ... ] }
    // commands might be an array or object depending on version, usually array of objects.
    let commands: ArtisanCommand[] = [];

    if (Array.isArray(parsed.commands)) {
      commands = parsed.commands;
    } else if (typeof parsed.commands === "object") {
      // sometimes it's an object keyed by command name?
      // Actually typical `php artisan list --format=json` returns "commands": [ ... ]
      commands = Object.values(parsed.commands);
    }

    // Filter out hidden commands usually? Or keep them? Let's keep normally usable ones.
    // "hidden": true property exists.
    commands = commands.filter((c) => !c.hidden);

    cache.set(cacheKey, JSON.stringify(commands));
    return commands;
  } catch (error) {
    console.error("Failed to fetch artisan commands", error);
    // Return empty or fallback
    return [];
  }
}
