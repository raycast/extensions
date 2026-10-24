import { constants } from "node:fs";
import { copyFile, mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import type { Diagram } from "./render";

export type DiagramFiles = Awaited<ReturnType<typeof writeDiagram>>;

export async function writeDiagram(diagram: Diagram, root: string) {
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(path.join(root, "pele-"));
  const svgPath = path.join(directory, `${diagram.type}.svg`);
  const pngPath = path.join(directory, `${diagram.type}.png`);
  try {
    await Promise.all([writeFile(svgPath, diagram.svg), writeFile(pngPath, diagram.png)]);
    return { svgPath, pngPath };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

export async function saveDiagram(source: string, directory?: string) {
  const targetDirectory = directory?.trim() || path.join(homedir(), "Downloads", "Pele");
  const expandedDirectory = targetDirectory.replace(/^~(?=[/\\]|$)/, homedir());
  if (!path.isAbsolute(expandedDirectory)) throw new Error("Choose an absolute path for the Save Folder preference.");
  await mkdir(expandedDirectory, { recursive: true });
  const target = path.join(
    expandedDirectory,
    `${path.basename(source, path.extname(source))}-${randomUUID()}${path.extname(source)}`,
  );
  await copyFile(source, target, constants.COPYFILE_EXCL);
  return target;
}

export async function cleanupPreviews(root: string, now = Date.now()) {
  await mkdir(root, { recursive: true });
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^pele-[\w-]+$/.test(entry.name)) continue;
    const directory = path.join(root, entry.name);
    const info = await stat(directory);
    if (now - info.mtimeMs > 7 * 24 * 60 * 60 * 1000) await rm(directory, { recursive: true, force: true });
  }
}
