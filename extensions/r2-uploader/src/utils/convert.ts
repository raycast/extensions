import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { showFailureToast } from "@raycast/utils";
import { AVIFENC_DEFAULT_PATH, CWEBP_DEFAULT_PATH } from "./constants";

const execFileAsync = promisify(execFile);

export async function convertToWebp(
  inputPath: string,
  cwebpPath: string = CWEBP_DEFAULT_PATH,
  quality: number = 80,
): Promise<string> {
  try {
    const outputPath = path.join(
      os.tmpdir(),
      `${path.basename(inputPath, path.extname(inputPath))}-${randomUUID()}.webp`,
    );

    await execFileAsync(cwebpPath, [inputPath, "-q", quality.toString(), "-o", outputPath]);

    return outputPath;
  } catch (error: unknown) {
    console.error("WebP conversion error:", error);
    await showFailureToast(error, { title: "WebP conversion failed" });
    throw error;
  }
}

export async function convertToAvif(
  inputPath: string,
  avifencPath: string = AVIFENC_DEFAULT_PATH,
  quality: number = 80,
): Promise<string> {
  try {
    const outputPath = path.join(path.dirname(inputPath), path.basename(inputPath, path.extname(inputPath)) + ".avif");

    await execFileAsync(avifencPath, ["-q", quality.toString(), "-s", "6", inputPath, outputPath]);

    return outputPath;
  } catch (error: unknown) {
    console.error("AVIF conversion error:", error);
    await showFailureToast(error, { title: "AVIF conversion failed" });
    throw error;
  }
}
