import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface MountedDrive {
  id: string;
  name: string;
  path: string;
}

export function getMountedDrives(): MountedDrive[] {
  const isWindows = process.platform === "win32";
  const systemDrive = isWindows ? (process.env.SystemDrive || "C:").toUpperCase() : "/";
  const systemDrivePath = isWindows ? `${systemDrive}\\` : "/";
  const systemDriveName = isWindows ? `System Drive (${systemDrive})` : "Macintosh HD (System)";

  const drives: MountedDrive[] = [
    { id: "global", name: "Global (All Locations)", path: "global" },
    { id: "home", name: "User Home (~)", path: os.homedir() },
    { id: "system", name: systemDriveName, path: systemDrivePath },
  ];

  if (isWindows) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const systemLetter = systemDrive.replace(":", "");
    for (const letter of letters) {
      if (letter === systemLetter) continue;
      const rootPath = `${letter}:\\`;
      try {
        if (fs.existsSync(rootPath)) {
          drives.push({
            id: rootPath,
            name: `Drive (${letter}:)`,
            path: rootPath,
          });
        }
      } catch {
        // Skip inaccessible drives
      }
    }
  } else {
    try {
      if (fs.existsSync("/Volumes")) {
        const entries = fs.readdirSync("/Volumes", { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith(".")) continue;
          if (entry.name === "Recovery") continue;
          const fullPath = path.join("/Volumes", entry.name);
          try {
            const real = fs.realpathSync(fullPath);
            if (real === "/") continue;
            drives.push({ id: fullPath, name: entry.name, path: fullPath });
          } catch {
            drives.push({ id: fullPath, name: entry.name, path: fullPath });
          }
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  return drives;
}

export function getCommonAdobeDocumentPaths(): string[] {
  const home = os.homedir();
  const candidates = [
    path.join(home, ".PremierePro"),
    path.join(home, "Documents", "Adobe", "Premiere Pro"),
    path.join(home, "Documents", "Adobe"),
  ];

  return candidates.filter((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });
}
