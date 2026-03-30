import { readdir } from "fs/promises";
import path from "path";
import { ScannedFile } from "./scanner";

function sanitizeVolumeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
}

export interface FileWithDestName extends ScannedFile {
  destFilename: string;
}

export function resolveCollisions(files: ScannedFile[]): {
  resolved: FileWithDestName[];
  collisionCount: number;
} {
  const groups = new Map<string, ScannedFile[]>();
  for (const file of files) {
    const key = file.basename.toLowerCase();
    const group = groups.get(key) || [];
    group.push(file);
    groups.set(key, group);
  }

  const resolved: FileWithDestName[] = [];
  let collisionCount = 0;

  for (const [, group] of groups) {
    if (group.length === 1) {
      resolved.push({ ...group[0], destFilename: group[0].basename });
    } else {
      collisionCount += group.length - 1;
      const volumeSet = new Set(group.map((f) => f.volumeName));
      if (volumeSet.size > 1) {
        // Cross-volume: suffix with sanitized volume name
        for (const file of group) {
          const suffix = sanitizeVolumeName(file.volumeName);
          const ext = path.extname(file.basename);
          const stem = path.basename(file.basename, ext);
          resolved.push({
            ...file,
            destFilename: `${stem}_${suffix}${ext}`,
          });
        }
      } else {
        // Same-volume: suffix with incrementing number to prevent overwrites
        for (let i = 0; i < group.length; i++) {
          const file = group[i];
          if (i === 0) {
            resolved.push({ ...file, destFilename: file.basename });
          } else {
            const ext = path.extname(file.basename);
            const stem = path.basename(file.basename, ext);
            resolved.push({
              ...file,
              destFilename: `${stem}_${i + 1}${ext}`,
            });
          }
        }
      }
    }
  }

  return { resolved, collisionCount };
}

export async function skipDuplicates(
  files: FileWithDestName[],
  destDir: string,
): Promise<{ toIngest: FileWithDestName[]; skippedCount: number }> {
  let existing: Set<string>;
  try {
    const entries = await readdir(destDir);
    existing = new Set(entries.map((e) => e.toLowerCase()));
  } catch {
    existing = new Set();
  }

  const toIngest: FileWithDestName[] = [];
  let skippedCount = 0;

  for (const file of files) {
    if (existing.has(file.destFilename.toLowerCase())) {
      skippedCount++;
    } else {
      toIngest.push(file);
    }
  }

  return { toIngest, skippedCount };
}
