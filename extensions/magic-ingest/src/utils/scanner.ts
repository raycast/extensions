import { readdir } from "fs/promises";
import path from "path";
import { ALL_EXTENSIONS, SIDECAR_EXTENSIONS } from "./constants";

export interface ScannedFile {
  absolutePath: string;
  basename: string; // e.g. "DSC01234.ARW"
  baseStem: string; // e.g. "DSC01234" (no extension)
  extension: string; // e.g. ".arw" (lowercase)
  volumeName: string; // e.g. "EOS_DIGITAL"
  volumePath: string; // e.g. "/Volumes/EOS_DIGITAL"
  isSidecar: boolean;
}

export async function scanVolume(
  volumePath: string,
  volumeName: string,
): Promise<ScannedFile[]> {
  const files: ScannedFile[] = [];
  const extensionSet = new Set(ALL_EXTENSIONS);

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // Permission denied or unreadable — skip
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden directories (e.g., .Trashes, .Spotlight-V100)
        if (!entry.name.startsWith(".")) {
          await walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensionSet.has(ext)) {
          const baseStem = path.basename(entry.name, path.extname(entry.name));
          files.push({
            absolutePath: fullPath,
            basename: entry.name,
            baseStem,
            extension: ext,
            volumeName,
            volumePath,
            isSidecar: SIDECAR_EXTENSIONS.includes(ext),
          });
        }
      }
    }
  }

  await walk(volumePath);
  return files;
}

export async function scanMultipleVolumes(
  volumes: Array<{ path: string; name: string }>,
): Promise<ScannedFile[]> {
  const results = await Promise.all(
    volumes.map((v) => scanVolume(v.path, v.name)),
  );
  return results.flat();
}
