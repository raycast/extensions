import { execSync } from "child_process";
import { statSync, existsSync } from "fs";
import path from "path";
import { getPreferences } from "./preferences";

interface SharpPaths {
  node: string;
  sharp: string;
}

export function getSharpPaths(): SharpPaths {
  const prefs = getPreferences();

  const getFromShell = (shell: string, sourceCmd: string): SharpPaths | null => {
    try {
      const nodePath = execSync(`${sourceCmd} which node`, {
        encoding: "utf-8",
        shell,
        timeout: 5000,
      }).trim();

      const sharpPath = execSync(`${sourceCmd} which sharp`, {
        encoding: "utf-8",
        shell,
        timeout: 5000,
      }).trim();

      if (nodePath && sharpPath) {
        return { node: nodePath, sharp: sharpPath };
      }
    } catch {
      // ignore
    }
    return null;
  };

  const zshResult = getFromShell("/bin/zsh", "source ~/.zshrc 2>/dev/null;");
  if (zshResult) return zshResult;

  const bashResult = getFromShell("/bin/bash", "source ~/.bashrc 2>/dev/null; source ~/.bash_profile 2>/dev/null;");
  if (bashResult) return bashResult;

  return {
    node: prefs.sharpPath?.replace("/sharp", "/node") || "/usr/local/bin/node",
    sharp: prefs.sharpPath || "/usr/local/bin/sharp",
  };
}

export type OutputFormat = "webp" | "avif" | "jpeg" | "png";

export interface CompressResult {
  inputPath: string;
  outputPath: string;
  inputSize: number;
  outputSize: number;
  ratio: number;
  success: boolean;
  error?: string;
}

export const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".tiff", ".tif", ".heic"];

export function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function generateShortHash(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let hash = "";
  for (let i = 0; i < 6; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

function getOutputPath(inputPath: string, format: OutputFormat): string {
  const prefs = getPreferences();
  const inputDir = path.dirname(inputPath);
  const baseName = path.basename(inputPath, path.extname(inputPath));

  const extMap: Record<OutputFormat, string> = {
    webp: ".webp",
    avif: ".avif",
    jpeg: ".jpg",
    png: ".png",
  };

  const outputDir = prefs.outputToSource ? inputDir : prefs.customOutputDir || inputDir;
  const ext = extMap[format];
  const inputExt = path.extname(inputPath).toLowerCase();

  if (prefs.overwriteOriginal && (inputExt === ext || (inputExt === ".jpeg" && ext === ".jpg"))) {
    return inputPath;
  }

  const hash = generateShortHash();
  return path.join(outputDir, `${baseName}_${hash}${ext}`);
}

function getOriginalFormat(inputPath: string): OutputFormat {
  const ext = path.extname(inputPath).toLowerCase();
  if ([".jpg", ".jpeg"].includes(ext)) return "jpeg";
  if (ext === ".png") return "png";
  if (ext === ".webp") return "webp";
  if (ext === ".avif") return "avif";
  return "jpeg";
}

const EXT_MAP: Record<OutputFormat, string> = {
  webp: ".webp",
  avif: ".avif",
  jpeg: ".jpg",
  png: ".png",
};

async function runSharp(inputPath: string, outputPath: string, format: OutputFormat): Promise<string> {
  const prefs = getPreferences();
  const tempDir = "/tmp/sharp-raycast";

  execSync(`mkdir -p "${tempDir}"`, { encoding: "utf-8" });

  let formatArgs: string[] = [];

  switch (format) {
    case "webp":
      formatArgs = ["-f", "webp", "-q", String(prefs.webpQuality)];
      break;
    case "avif":
      formatArgs = ["-f", "avif", "-q", String(prefs.avifQuality)];
      break;
    case "jpeg":
      formatArgs = ["-f", "jpeg", "-q", String(prefs.jpegQuality), "--mozjpeg"];
      break;
    case "png":
      formatArgs = ["-f", "png"];
      break;
  }

  const paths = getSharpPaths();
  const cmd = `"${paths.node}" "${paths.sharp}" -i "${inputPath}" -o "${tempDir}" ${formatArgs.join(" ")}`;

  try {
    execSync(cmd, {
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 120000,
    });
  } catch (e: unknown) {
    const error = e as { stderr?: string; stdout?: string; message?: string };
    throw new Error(
      `Command: ${cmd}\nStderr: ${error.stderr || ""}\nStdout: ${error.stdout || ""}\nMessage: ${error.message || ""}`,
    );
  }

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const tempOutput = path.join(tempDir, `${baseName}${EXT_MAP[format]}`);

  if (!existsSync(tempOutput)) {
    throw new Error(`Output file not found: ${tempOutput}`);
  }

  execSync(`mv "${tempOutput}" "${outputPath}"`, { encoding: "utf-8" });
  return cmd;
}

export async function convertToWebP(inputPath: string): Promise<CompressResult> {
  const inputSize = statSync(inputPath).size;
  const outputPath = getOutputPath(inputPath, "webp");

  try {
    await runSharp(inputPath, outputPath, "webp");
    const outputSize = statSync(outputPath).size;

    return {
      inputPath,
      outputPath,
      inputSize,
      outputSize,
      ratio: (outputSize / inputSize) * 100,
      success: true,
    };
  } catch (error) {
    return {
      inputPath,
      outputPath,
      inputSize,
      outputSize: 0,
      ratio: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function convertToAvif(inputPath: string): Promise<CompressResult> {
  const inputSize = statSync(inputPath).size;
  const outputPath = getOutputPath(inputPath, "avif");

  try {
    await runSharp(inputPath, outputPath, "avif");
    const outputSize = statSync(outputPath).size;

    return {
      inputPath,
      outputPath,
      inputSize,
      outputSize,
      ratio: (outputSize / inputSize) * 100,
      success: true,
    };
  } catch (error) {
    return {
      inputPath,
      outputPath,
      inputSize,
      outputSize: 0,
      ratio: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function compressOriginal(inputPath: string): Promise<CompressResult> {
  const inputSize = statSync(inputPath).size;
  const format = getOriginalFormat(inputPath);
  const outputPath = getOutputPath(inputPath, format);

  try {
    await runSharp(inputPath, outputPath, format);
    const outputSize = statSync(outputPath).size;

    return {
      inputPath,
      outputPath,
      inputSize,
      outputSize,
      ratio: (outputSize / inputSize) * 100,
      success: true,
    };
  } catch (error) {
    return {
      inputPath,
      outputPath,
      inputSize,
      outputSize: 0,
      ratio: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function processImages(
  filePaths: string[],
  processor: (path: string) => Promise<CompressResult>,
): Promise<CompressResult[]> {
  const results: CompressResult[] = [];
  for (const filePath of filePaths) {
    const result = await processor(filePath);
    results.push(result);
  }
  return results;
}

export function summarizeResults(results: CompressResult[]): {
  total: number;
  success: number;
  failed: number;
  totalInputSize: number;
  totalOutputSize: number;
  savedBytes: number;
  averageRatio: number;
} {
  const successful = results.filter((r) => r.success);
  const totalInputSize = successful.reduce((sum, r) => sum + r.inputSize, 0);
  const totalOutputSize = successful.reduce((sum, r) => sum + r.outputSize, 0);

  return {
    total: results.length,
    success: successful.length,
    failed: results.length - successful.length,
    totalInputSize,
    totalOutputSize,
    savedBytes: totalInputSize - totalOutputSize,
    averageRatio: successful.length > 0 ? successful.reduce((sum, r) => sum + r.ratio, 0) / successful.length : 0,
  };
}
