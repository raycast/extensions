import { MANIFEST_FILE_NAME } from "../constraints";
import { homedir } from "node:os";
import { createDirIfNotExists, writeFile, fileExists } from "./file";
import { dirname, join } from "node:path";
import { ManifestData } from "image-shield";
import { getSelectedFinderItems } from "@raycast/api";

export function bufferToDataUrl(buffer: Buffer, mimeType = "image/png") {
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

export async function findManifestAndImages(filePaths: string[]) {
  const manifestPath = filePaths.find((path: string) => path.endsWith(MANIFEST_FILE_NAME));
  const imagePaths = filePaths.filter((path: string) => path !== manifestPath).sort();

  if (!manifestPath) {
    throw new Error(`No "${MANIFEST_FILE_NAME}" file selected.`);
  }

  if (imagePaths.length === 0) {
    throw new Error("No image files selected.");
  }

  for (const filePath of filePaths) {
    if (!(await fileExists(filePath))) {
      throw new Error(`"${filePath}" does not exist.`);
    }
  }

  const workdir = dirname(manifestPath);

  return {
    manifestPath,
    imagePaths,
    workdir,
  };
}

export async function findImages(filePaths: string[]) {
  const imagePaths = filePaths.sort();

  if (imagePaths.length === 0) {
    throw new Error("No image files selected.");
  }

  for (const filePath of filePaths) {
    if (!(await fileExists(filePath))) {
      throw new Error(`"${filePath}" does not exist.`);
    }
  }

  return {
    imagePaths,
  };
}

export async function getSelectedItems(): Promise<string[]> {
  try {
    return (await getSelectedFinderItems()).map((f) => f.path).sort();
  } catch (e) {
    // Do nothing if no files are selected
    console.log(String(e));
    return [];
  }
}

export async function writeManifest(manifest: ManifestData, fileName: string, basePath?: string) {
  const outputDir = `${manifest.id}`;
  const outputPath = basePath ? join(basePath, outputDir) : join(homedir(), "Downloads", outputDir);
  await createDirIfNotExists(outputPath);
  await writeFile(outputPath, fileName, JSON.stringify(manifest, null, 2));
}

export async function writeEncryptedImage(
  manifest: ManifestData,
  imageBuffer: Buffer,
  fileName: string,
  basePath?: string,
) {
  const outputDir = `${manifest.id}`;
  const outputPath = basePath ? join(basePath, outputDir) : join(homedir(), "Downloads", outputDir);
  await createDirIfNotExists(outputPath);
  await writeFile(outputPath, fileName, imageBuffer);
}

export async function writeRestoredImage(
  manifest: ManifestData,
  imageBuffer: Buffer,
  fileName: string,
  basePath?: string,
) {
  const outputDir = `${manifest.id}_restored`;
  const outputPath = basePath ? join(basePath, outputDir) : join(homedir(), "Downloads", outputDir);
  await createDirIfNotExists(outputPath);
  await writeFile(outputPath, fileName, imageBuffer);
}
