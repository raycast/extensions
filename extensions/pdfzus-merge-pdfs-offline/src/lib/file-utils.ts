import fs from "node:fs";
import path from "node:path";
import { showInFinder } from "@raycast/api";

export type SelectedPdfFile = {
  id: string;
  path: string;
  name: string;
  sizeInBytes: number;
};

export const toSelectedPdfFiles = (filePaths: string[]): SelectedPdfFile[] => {
  const uniquePaths = Array.from(new Set(filePaths));

  return uniquePaths.flatMap((filePath, index) => {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return [];
    }

    if (path.extname(filePath).toLowerCase() !== ".pdf") {
      return [];
    }

    return [
      {
        id: `${index}-${filePath}`,
        path: filePath,
        name: path.basename(filePath),
        sizeInBytes: stats.size,
      },
    ];
  });
};

export const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let size = sizeInBytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

export const defaultOutputName = (files: SelectedPdfFile[]): string => {
  if (files.length === 0) {
    return "merged-pdfzus.pdf";
  }

  const firstFileName = files[0].name.replace(/\.pdf$/i, "");
  return `${firstFileName}-merged.pdf`;
};

export const normalizeOutputName = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Please provide an output file name.");
  }

  const withoutExtension = trimmed.replace(/\.pdf$/i, "");
  const sanitized = Array.from(withoutExtension)
    .map((character) => {
      if (/[<>:"/\\|?*]/.test(character) || character.charCodeAt(0) < 32) {
        return "-";
      }

      return character;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized) {
    throw new Error("The output file name contains unsupported characters.");
  }

  return `${sanitized}.pdf`;
};

export const resolveOutputPath = (outputDirectory: string, outputName: string): string => {
  if (!fs.existsSync(outputDirectory) || !fs.statSync(outputDirectory).isDirectory()) {
    throw new Error("Please choose a valid output folder.");
  }

  const resolvedPath = path.join(outputDirectory, outputName);

  if (fs.existsSync(resolvedPath)) {
    throw new Error("A file with the same name already exists in the selected folder.");
  }

  return resolvedPath;
};

export const revealInFinder = async (targetPath: string): Promise<void> => {
  await showInFinder(targetPath);
};
