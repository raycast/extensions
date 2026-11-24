import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { AVIFENC_DEFAULT_PATH, CWEBP_DEFAULT_PATH } from "./constants";

const execFileAsync = promisify(execFile);

async function resolveEncoderPath(configuredPath: string | undefined, defaultPath: string, versionFlag: string) {
  const command = path.basename(defaultPath);
  const candidates = new Set([
    configuredPath || defaultPath,
    defaultPath,
    path.join("/usr/local/bin", command),
    command,
  ]);
  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, [versionFlag]);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

export function resolveAvifencPath(configuredPath?: string) {
  return resolveEncoderPath(configuredPath, AVIFENC_DEFAULT_PATH, "--version");
}

export function resolveCwebpPath(configuredPath?: string) {
  return resolveEncoderPath(configuredPath, CWEBP_DEFAULT_PATH, "-version");
}

async function convertImage(
  inputPath: string,
  extension: ".avif" | ".webp",
  encode: (outputPath: string) => Promise<unknown>,
): Promise<string> {
  const outputDirectory = await mkdtemp(path.join(tmpdir(), "r2-uploader-"));
  try {
    const outputPath = path.join(outputDirectory, path.basename(inputPath, path.extname(inputPath)) + extension);

    await encode(outputPath);

    return outputPath;
  } catch (error: unknown) {
    await rm(outputDirectory, { recursive: true, force: true });
    throw error;
  }
}

export function convertToAvif(inputPath: string, avifencPath: string, quality: number): Promise<string> {
  return convertImage(inputPath, ".avif", (outputPath) =>
    execFileAsync(avifencPath, ["-q", quality.toString(), "-s", "6", inputPath, outputPath]),
  );
}

export function convertToWebp(inputPath: string, cwebpPath: string, quality: number): Promise<string> {
  return convertImage(inputPath, ".webp", (outputPath) =>
    execFileAsync(cwebpPath, [inputPath, "-q", quality.toString(), "-o", outputPath]),
  );
}
