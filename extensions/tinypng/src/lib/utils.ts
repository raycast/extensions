import { existsSync, mkdirSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join } from "node:path";
import { homedir } from "node:os";

export const isMacOS = process.platform === "darwin";

export const SUPPORTED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".avif"];

export const filterSupportedImagePaths = (filePaths: string[]) => {
  return filePaths.filter((filePath) => SUPPORTED_IMAGE_EXTENSIONS.includes(extname(filePath).toLowerCase()));
};

export const resolveOutputPath = (filePath: string, destinationFolderPath: string) => {
  const expandedDestinationFolderPath = destinationFolderPath.replace(/^~($|\/|\\)/, `${homedir()}/`);

  if (isAbsolute(expandedDestinationFolderPath)) {
    return expandedDestinationFolderPath;
  } else {
    return join(dirname(filePath), expandedDestinationFolderPath);
  }
};

type ResolveOutputFileOptions = {
  destinationFolderPath: string;
  overwrite: boolean;
  isSingleFile: boolean;
  suffix: string;
};

export const resolveOutputFile = (filePath: string, options: ResolveOutputFileOptions) => {
  if (options.overwrite) {
    return filePath;
  }

  const ext = extname(filePath);
  const suffixedFileName = `${basename(filePath, ext)}${options.suffix}${ext}`;

  if (options.isSingleFile) {
    return join(dirname(filePath), suffixedFileName);
  }

  const outputDir = resolveOutputPath(filePath, options.destinationFolderPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir);
  }

  const outputPath = join(outputDir, basename(filePath));
  if (outputPath === filePath) {
    return join(outputDir, suffixedFileName);
  }
  return outputPath;
};
