import { createHash } from "node:crypto";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { environment } from "@raycast/api";
import { pondClient } from "./api";

// Only the selected save is fetched. Keep at most 100 previews between launches.
export async function loadThumbnail(id: string, libraryId: string) {
  const client = pondClient();
  const thumbnail = await client.thumbnail(id);
  if (!thumbnail) return null;
  const folder = join(environment.supportPath, "previews");
  await mkdir(folder, { recursive: true });
  const name = createHash("sha256")
    .update(JSON.stringify([client.baseUrl, libraryId, id]))
    .digest("hex");
  const path = join(folder, `${name}.${thumbnail.extension}`);
  await writeFile(path, thumbnail.bytes);
  const files = await Promise.all(
    (await readdir(folder)).map(async (file) => {
      const filePath = join(folder, file);
      return { path: filePath, modified: (await stat(filePath).catch(() => null))?.mtimeMs ?? 0 };
    }),
  );
  files.sort((a, b) => b.modified - a.modified);
  await Promise.all(
    files
      .slice(100)
      .filter((file) => file.path !== path)
      .map((file) => rm(file.path, { force: true })),
  );
  return { id, libraryId, path };
}
