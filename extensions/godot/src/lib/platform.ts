// Everything that depends on macOS lives here: where Godot keeps its files, how to find the
// installed apps, and how to launch them. A Windows version can replace this module.
import { execFile } from "node:child_process";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { GODOT_BUNDLE_ID, GodotApp, parsePlistStrings } from "./apps";

const execFileAsync = promisify(execFile);

/** Godot 4 keeps the Project Manager's list in `<data dir>/Godot/projects.cfg` (EditorPaths::get_data_dir()). */
export function getProjectListPath(home = homedir()): string {
  return path.join(home, "Library", "Application Support", "Godot", "projects.cfg");
}

export function getAppSearchFolders(home = homedir()): string[] {
  return ["/Applications", path.join(home, "Applications")];
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readPlistText(plistPath: string): Promise<string> {
  const data = await readFile(plistPath);
  if (data.subarray(0, 6).toString("latin1") !== "bplist") return data.toString("utf8");
  const { stdout } = await execFileAsync("/usr/bin/plutil", ["-convert", "xml1", "-o", "-", plistPath]);
  return stdout;
}

/** Reads an app bundle. Returns undefined when it doesn't exist, or with `requireGodot` when it isn't Godot. */
export async function readApp(appPath: string, requireGodot: boolean): Promise<GodotApp | undefined> {
  if (!(await exists(appPath))) return undefined;
  let info: Record<string, string> = {};
  try {
    info = parsePlistStrings(await readPlistText(path.join(appPath, "Contents", "Info.plist")));
  } catch {
    if (requireGodot) return undefined;
  }
  if (requireGodot && info.CFBundleIdentifier !== GODOT_BUNDLE_ID) return undefined;
  return {
    path: appPath,
    name: path.basename(appPath, ".app"),
    version: info.CFBundleShortVersionString || undefined,
    isDotnet: await exists(path.join(appPath, "Contents", "Resources", "GodotSharp")),
  };
}

/** Apps named like Godot in the app folders, also one folder deep (for example /Applications/Godot/). */
async function findAppsByName(folders: string[]): Promise<string[]> {
  const found: string[] = [];
  const scan = async (folder: string, depth: number) => {
    let names: string[];
    try {
      names = await readdir(folder);
    } catch {
      return;
    }
    for (const name of names) {
      if (!/godot/i.test(name)) continue;
      const fullPath = path.join(folder, name);
      if (name.endsWith(".app")) {
        found.push(fullPath);
      } else if (depth === 0) {
        await scan(fullPath, 1);
      }
    }
  };
  for (const folder of folders) await scan(folder, 0);
  return found;
}

/** Apps anywhere on the Mac with Godot's bundle ID, when Spotlight is turned on. */
async function findAppsWithSpotlight(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/mdfind", [`kMDItemCFBundleIdentifier == '${GODOT_BUNDLE_ID}'`], {
      timeout: 5000,
    });
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.endsWith(".app") && !line.includes("/.Trash/"));
  } catch {
    return [];
  }
}

export async function findGodotApps(folders = getAppSearchFolders()): Promise<GodotApp[]> {
  const [byName, bySpotlight] = await Promise.all([findAppsByName(folders), findAppsWithSpotlight()]);

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const appPath of [...byName, ...bySpotlight]) {
    const key = await realpath(appPath).catch(() => appPath);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(appPath);
  }

  const apps = await Promise.all(unique.map((appPath) => readApp(appPath, true)));
  return apps.filter((app): app is GodotApp => app !== undefined);
}

/**
 * Starts a new Godot process with the given arguments. `open -n` asks Launch Services for a new
 * instance, like Godot's own OS_MacOS::create_process() does, so it works while Godot is open.
 */
export async function launchGodot(appPath: string, args: string[]): Promise<void> {
  try {
    await execFileAsync("/usr/bin/open", ["-n", "-a", appPath, "--args", ...args]);
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim();
    throw new Error(stderr || (error instanceof Error ? error.message : String(error)));
  }
}
