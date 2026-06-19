import fs from "fs";
import os from "os";
import path from "path";

export interface SvgCopyResult {
  path: string;
  tempPaths: string[];
}

interface CopyDiagramImageOptions {
  format: string;
  imagePath: string;
  previewRasterPath: string | null;
  copyRasterImage: (imagePath: string) => Promise<void>;
  resolveSvgCopy: (options: { svgPath: string; previewRasterPath: string | null }) => Promise<SvgCopyResult>;
  cleanupTempPath?: (tempPath: string) => void;
}

interface CopySvgCodeOptions {
  imagePath: string;
  copyText: (text: string) => Promise<void>;
  readUtf8File?: (filePath: string) => string;
}

interface CopyAsciiCodeOptions {
  asciiContent: string;
  copyText: (text: string) => Promise<void>;
}

interface SaveDiagramFileOptions {
  imagePath: string;
  format: string;
  customSavePath?: string;
  homeDir?: string;
  fileExists?: (filePath: string) => boolean;
  copyFile?: (source: string, destination: string) => void;
  now?: () => number;
}

export async function copyDiagramImage({
  format,
  imagePath,
  previewRasterPath,
  copyRasterImage,
  resolveSvgCopy,
  cleanupTempPath = () => undefined,
}: CopyDiagramImageOptions): Promise<void> {
  if (format !== "svg") {
    await copyRasterImage(imagePath);
    return;
  }

  const raster = await resolveSvgCopy({ svgPath: imagePath, previewRasterPath });

  try {
    await copyRasterImage(raster.path);
  } finally {
    for (const tempPath of raster.tempPaths) {
      cleanupTempPath(tempPath);
    }
  }
}

export async function copySvgCode({
  imagePath,
  copyText,
  readUtf8File = (filePath) => fs.readFileSync(filePath, "utf-8"),
}: CopySvgCodeOptions): Promise<void> {
  await copyText(readUtf8File(imagePath));
}

export async function copyAsciiCode({ asciiContent, copyText }: CopyAsciiCodeOptions): Promise<void> {
  await copyText(asciiContent);
}

export function saveDiagramFile({
  imagePath,
  format,
  customSavePath,
  homeDir = os.homedir(),
  fileExists = fs.existsSync,
  copyFile = fs.copyFileSync,
  now = Date.now,
}: SaveDiagramFileOptions): string {
  const trimmedCustomPath = customSavePath?.trim();
  const saveDir =
    trimmedCustomPath && fileExists(trimmedCustomPath) ? trimmedCustomPath : path.join(homeDir, "Downloads");
  const savedPath = path.join(saveDir, `mermaid-diagram-${now()}.${format}`);
  copyFile(imagePath, savedPath);
  return savedPath;
}

export async function openDiagramFile(
  imagePath: string,
  openPath: (path: string, application?: string) => Promise<void>,
): Promise<void> {
  await openPath(imagePath);
}
