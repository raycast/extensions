import { createHash } from "node:crypto";
import { constants, promises as fs } from "node:fs";
import path from "node:path";
import { environment } from "@raycast/api";
import type { GifItem } from "./types";

function safeStem(filePath: string) {
  return (
    path
      .basename(filePath, path.extname(filePath))
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .slice(0, 60) || "gif"
  );
}

export interface ImportedGifFiles {
  items: GifItem[];
  rollback: () => Promise<void>;
}

export async function importGifFiles(
  paths: string[],
): Promise<ImportedGifFiles> {
  const library = path.join(environment.supportPath, "library");
  await fs.mkdir(library, { recursive: true });
  const prepared = await Promise.all(
    paths.map(async (source) => {
      if (path.extname(source).toLowerCase() !== ".gif")
        throw new Error(`${path.basename(source)} is not a GIF file`);
      const bytes = await fs.readFile(source);
      if (
        bytes.subarray(0, 6).toString("ascii") !== "GIF87a" &&
        bytes.subarray(0, 6).toString("ascii") !== "GIF89a"
      ) {
        throw new Error(
          `${path.basename(source)} does not contain valid GIF data`,
        );
      }
      const digest = createHash("sha256")
        .update(bytes)
        .digest("hex")
        .slice(0, 20);
      const destination = path.join(
        library,
        `${safeStem(source)}-${digest}.gif`,
      );
      return { source, bytes, digest, destination };
    }),
  );

  const createdPaths: string[] = [];
  const imported: GifItem[] = [];
  try {
    for (const { source, bytes, digest, destination } of prepared) {
      try {
        await fs.copyFile(source, destination, constants.COPYFILE_EXCL);
        createdPaths.push(destination);
      } catch (error) {
        if (!(
          error instanceof Error &&
          "code" in error &&
          error.code === "EEXIST"
        ))
          throw error;
      }
      imported.push({
        id: `local:${digest}`,
        title: path.basename(source, path.extname(source)),
        source: "local",
        previewUrl: destination,
        originalUrl: destination,
        originalSize: bytes.byteLength,
        localPath: destination,
        managedCopy: true,
        importedAt: Date.now(),
      });
    }
  } catch (error) {
    await Promise.allSettled(createdPaths.map((file) => fs.unlink(file)));
    throw error;
  }

  return {
    items: imported,
    rollback: async () => {
      await Promise.allSettled(createdPaths.map((file) => fs.unlink(file)));
    },
  };
}

const MAX_DISCOVERED_GIFS = 10_000;

export async function discoverGifFolders(
  folders: string[],
): Promise<GifItem[]> {
  const discovered: GifItem[] = [];
  const seenPaths = new Set<string>();

  async function walk(folder: string, root: string): Promise<void> {
    if (discovered.length >= MAX_DISCOVERED_GIFS) return;
    let entries;
    try {
      entries = await fs.readdir(folder, { withFileTypes: true });
    } catch (error) {
      throw new Error(`Could not read linked GIF folder “${folder}”`, {
        cause: error,
      });
    }
    for (const entry of entries) {
      if (discovered.length >= MAX_DISCOVERED_GIFS) return;
      const itemPath = path.join(folder, entry.name);
      if (entry.isDirectory()) {
        await walk(itemPath, root);
      } else if (
        entry.isFile() &&
        path.extname(entry.name).toLowerCase() === ".gif"
      ) {
        const resolved = path.resolve(itemPath);
        const normalized =
          process.platform === "win32" ? resolved.toLowerCase() : resolved;
        if (seenPaths.has(normalized)) continue;
        seenPaths.add(normalized);
        const digest = createHash("sha256")
          .update(normalized)
          .digest("hex")
          .slice(0, 20);
        const file = await fs.stat(itemPath).catch(() => undefined);
        discovered.push({
          id: `folder:${digest}`,
          title: path.basename(entry.name, path.extname(entry.name)),
          source: "local",
          previewUrl: itemPath,
          originalUrl: itemPath,
          originalSize: file?.size,
          localPath: itemPath,
          watchedFolder: root,
          managedCopy: false,
        });
      }
    }
  }

  for (const folder of folders) await walk(folder, folder);
  return discovered.sort((left, right) =>
    left.title.localeCompare(right.title),
  );
}
