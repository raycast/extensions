import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import { getPrefs } from "./prefs";
import { findWallpaperEnginePath, pathExists } from "./discovery";

const execAsync = promisify(exec);

export async function execWallpaperEngine(args: string[]): Promise<string> {
  const prefs = getPrefs();
  let basePath = prefs.wallpaperEnginePath;

  if (!basePath) {
    const foundPath = await findWallpaperEnginePath();
    if (foundPath) {
      basePath = foundPath;
    }
  }

  if (!basePath) {
    throw new Error(
      "WallpaperEngine not found. Please set the path in extension preferences.",
    );
  }

  const wallpaper32 = path.join(basePath, "wallpaper32.exe");
  const wallpaper64 = path.join(basePath, "wallpaper64.exe");

  let executable: string;
  if (await pathExists(wallpaper64)) {
    executable = wallpaper64;
  } else if (await pathExists(wallpaper32)) {
    executable = wallpaper32;
  } else {
    throw new Error(`WallpaperEngine executable not found in ${basePath}`);
  }

  const argsStr = args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ");
  const command = `"${executable}" -control ${argsStr}`;

  try {
    await execAsync(command);
    return "";
  } catch (error) {
    if (error && typeof error === "object") {
      const err = error as {
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      const output = (err.stdout || err.stderr || "").trim();
      if (output) {
        return output;
      }
    }
    throw error;
  }
}
