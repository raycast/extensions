import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { Destination } from "../domain/destination";
import { createKeepBothPath } from "../domain/file-conflicts";
import { isDirectory, pathExists } from "./filesystem";

export async function exportDestinations(destinations: readonly Destination[]): Promise<string> {
  const downloads = join(homedir(), "Downloads");
  const exportDirectory = (await isDirectory(downloads)) ? downloads : homedir();
  const date = new Date().toISOString().slice(0, 10);
  const desiredPath = join(exportDirectory, `copymoveto-list-destinations-${date}.json`);
  const exportPath = await createKeepBothPath(desiredPath, pathExists);
  const payload = destinations.map(({ id, name, path, keywords, copy, move, pinned }) => ({
    id,
    name,
    path,
    keywords,
    copy,
    move,
    pinned,
  }));

  await writeFile(exportPath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return exportPath;
}
