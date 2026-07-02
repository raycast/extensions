import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { FirefoxProfile } from "../../types";

function parseIni(content: string): Record<string, Record<string, string>> {
  const sections: Record<string, Record<string, string>> = {};
  let current = "";
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    const sectionMatch = /^\[(.+)\]$/.exec(trimmed);
    if (sectionMatch) {
      current = sectionMatch[1];
      sections[current] = {};
    } else if (current) {
      const keyMatch = /^([^=]+)=(.*)$/.exec(trimmed);
      if (keyMatch) {
        sections[current][keyMatch[1].trim()] = keyMatch[2].trim();
      }
    }
  }
  return sections;
}

function resolveProfilePath(rawPath: string, iniDir: string): string {
  return path.isAbsolute(rawPath) ? rawPath : path.join(iniDir, rawPath);
}

export async function resolveDefaultProfile(): Promise<FirefoxProfile> {
  const appData =
    process.env["APPDATA"] ??
    (process.env["USERPROFILE"] ? path.join(process.env["USERPROFILE"], "AppData", "Roaming") : null) ??
    path.join(os.homedir(), "AppData", "Roaming");

  const iniPath = path.join(appData, "Mozilla", "Firefox", "profiles.ini");
  if (!fs.existsSync(iniPath)) {
    throw new Error("Firefox profiles.ini not found. Is Firefox installed?");
  }

  const content = fs.readFileSync(iniPath, "utf8");
  const sections = parseIni(content);
  const iniDir = path.dirname(iniPath);

  let profileRelPath: string | undefined;

  for (const [section, entries] of Object.entries(sections)) {
    if (section.startsWith("Install") && entries["Default"]) {
      profileRelPath = entries["Default"];
      break;
    }
  }

  if (!profileRelPath) {
    for (const [section, entries] of Object.entries(sections)) {
      if (section.startsWith("Profile") && entries["Default"] === "1" && entries["Path"]) {
        profileRelPath = entries["Path"];
        break;
      }
    }
  }

  if (!profileRelPath) {
    for (const [section, entries] of Object.entries(sections)) {
      if (section.startsWith("Profile") && entries["Path"]) {
        profileRelPath = entries["Path"];
        break;
      }
    }
  }

  if (!profileRelPath) {
    throw new Error("No Firefox profile found in profiles.ini");
  }

  const absoluteProfilePath = resolveProfilePath(profileRelPath, iniDir);
  const placesDbPath = path.join(absoluteProfilePath, "places.sqlite");

  if (!fs.existsSync(placesDbPath)) {
    throw new Error(`Firefox places.sqlite not found at: ${placesDbPath}`);
  }

  return {
    name: path.basename(absoluteProfilePath),
    path: absoluteProfilePath,
    placesDbPath,
    isDefault: true,
  };
}
