import fs from "node:fs";
import path from "node:path";
import { currentPlatformAdapter } from "../platforms";
import { IPlatformAdapter } from "../platforms/types";
import { PremiereExtension, PremiereFile } from "../types";
import { formatFileSize, isValidPremiereExtension } from "../utils/format";
import { readProjectMetadata } from "./metadata";

export async function createPremiereFile(filePath: string): Promise<PremiereFile | null> {
  try {
    if (!fs.existsSync(filePath)) return null;

    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) return null;

    const rawExt = path.extname(filePath).replace(".", "").toLowerCase();
    if (!isValidPremiereExtension(rawExt)) return null;

    const dir = path.dirname(filePath);
    const fileName = path.basename(filePath);
    const dotIndex = fileName.lastIndexOf(".");
    const title = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
    const directoryName = path.basename(dir);

    const metadata = await readProjectMetadata(filePath);

    return {
      id: filePath,
      name: fileName,
      title,
      path: filePath,
      directory: dir,
      directoryName,
      extension: rawExt as PremiereExtension,
      sizeInBytes: stats.size,
      formattedSize: formatFileSize(stats.size),
      lastModifiedDate: stats.mtime,
      lastOpenedDate: stats.atime,
      version: metadata.version,
      sequences: metadata.sequences,
      sequenceCount: metadata.sequences.length,
      dimensions: metadata.dimensions,
      frameRate: metadata.frameRate,
      isProductionProject: metadata.isProductionProject,
      productionName: metadata.productionName,
      exists: true,
    };
  } catch {
    return null;
  }
}

export async function getRecentPremiereProjects(
  limit = 80,
  adapter: IPlatformAdapter = currentPlatformAdapter,
): Promise<PremiereFile[]> {
  const rawPaths = await adapter.getRecentProjectPaths(limit);
  const hydrated = await Promise.all(rawPaths.map((p) => createPremiereFile(p)));
  return hydrated.filter((f): f is PremiereFile => f !== null);
}
