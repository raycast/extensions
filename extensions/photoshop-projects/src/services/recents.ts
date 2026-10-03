import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PhotoshopFile } from "../types";
import { isValidPhotoshopExtension } from "../utils/format";
import { getRunningPhotoshopName, runAppleScript } from "../utils/osascript";
import { createPhotoshopFile, runMdfind } from "../utils/spotlight";

const execFileAsync = promisify(execFile);

async function getRunningPhotoshopRecents(): Promise<string[]> {
  const appName = await getRunningPhotoshopName();
  if (!appName) return [];

  const script = `tell application "${appName}" to do javascript "var files = []; try { for (var i = 0; i < app.recentFiles.length; i++) { files.push(app.recentFiles[i].fsName); } } catch(e) {} files.join(String.fromCharCode(10));"`;
  const result = await runAppleScript(script, 3000);
  if (!result) return [];

  return result
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && fs.existsSync(p));
}

async function getMediaBrowserRecents(): Promise<string[]> {
  const plistPath = path.join(os.homedir(), "Library/Preferences/com.adobe.mediabrowser.plist");
  if (!fs.existsSync(plistPath)) return [];

  try {
    const { stdout } = await execFileAsync("/usr/bin/plutil", ["-convert", "xml1", "-o", "-", plistPath], {
      timeout: 3000,
      encoding: "utf8",
    });

    const paths: string[] = [];
    const regex = /<key>file-path<\/key>\s*<string>([^<]+)<\/string>/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(stdout)) !== null) {
      const candidatePath = match[1].trim();
      if (candidatePath && fs.existsSync(candidatePath)) {
        paths.push(candidatePath);
      }
    }

    return paths;
  } catch {
    return [];
  }
}

async function getMachinePrefsRecents(): Promise<string[]> {
  const preferencesDir = path.join(os.homedir(), "Library/Preferences");
  if (!fs.existsSync(preferencesDir)) return [];

  const paths: string[] = [];

  try {
    const entries = await fs.promises.readdir(preferencesDir, { withFileTypes: true });
    const settingsDirs = entries.filter(
      (e) => e.isDirectory() && e.name.startsWith("Adobe Photoshop") && e.name.endsWith("Settings"),
    );

    for (const dir of settingsDirs) {
      const machinePrefsFile = path.join(preferencesDir, dir.name, "MachinePrefs.psp");
      if (fs.existsSync(machinePrefsFile)) {
        try {
          const buffer = await fs.promises.readFile(machinePrefsFile);
          const text = buffer.toString("utf8", 0, Math.min(buffer.length, 2 * 1024 * 1024));
          const matches = text.match(/\/Users\/[^\s"']+\.(psd|psb|psdt|pdd)/gi);
          if (matches) {
            for (const matchedPath of matches) {
              if (fs.existsSync(matchedPath)) {
                paths.push(matchedPath);
              }
            }
          }
        } catch (error) {
          void error;
        }
      }
    }
  } catch (error) {
    void error;
  }

  return paths;
}

async function getSpotlightRecents(limit = 40): Promise<string[]> {
  const query =
    "(kMDItemContentType == 'com.adobe.photoshop-image' || kMDItemFSName == '*.psd'c || kMDItemFSName == '*.psb'c) && kMDItemLastUsedDate != null";
  return runMdfind(query, undefined, limit);
}

export async function getRecentPhotoshopProjects(maxCount = 60): Promise<PhotoshopFile[]> {
  const seenPaths = new Set<string>();
  const orderedPaths: string[] = [];

  const addPath = (p: string) => {
    const ext = path.extname(p).replace(".", "").toLowerCase();
    if (!isValidPhotoshopExtension(ext)) return;
    const normalized = path.resolve(p);
    if (!seenPaths.has(normalized) && fs.existsSync(normalized)) {
      seenPaths.add(normalized);
      orderedPaths.push(normalized);
    }
  };

  const runningRecents = await getRunningPhotoshopRecents();
  for (const p of runningRecents) addPath(p);

  const mediaBrowserRecents = await getMediaBrowserRecents();
  for (const p of mediaBrowserRecents) addPath(p);

  const machinePrefsRecents = await getMachinePrefsRecents();
  for (const p of machinePrefsRecents) addPath(p);

  const spotlightRecents = await getSpotlightRecents(maxCount);
  for (const p of spotlightRecents) addPath(p);

  const slice = orderedPaths.slice(0, maxCount);
  const hydrated = await Promise.all(slice.map((p) => createPhotoshopFile(p)));

  return hydrated.filter((f): f is PhotoshopFile => f !== null);
}
