import { environment } from "@raycast/api";
import { chmod } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { OcrError, ScreenRecordingPermissionError } from "./ocr-errors";

const execFileAsync = promisify(execFile);

export async function recognizeText(imagePath?: string, timeoutMs = 90_000): Promise<string | undefined> {
  const command = join(environment.assetsPath, "recognizeText");

  try {
    await chmod(command, "755");
  } catch (error) {
    throw new OcrError(`OCR helper is missing or not executable: ${errorMessage(error)}`);
  }

  try {
    const { stdout } = await execFileAsync(command, imagePath ? [imagePath] : [], {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    });
    const text = stdout.trim();
    return text.length > 0 ? text : undefined;
  } catch (error) {
    const message = errorMessage(error);
    const stderr = execErrorStderr(error);
    const code = execErrorCode(error);
    const combined = `${message}\n${stderr}`.toLowerCase();

    // Exit code 2 = the helper ran fine but found no text on the image.
    if (code === 2) {
      return undefined;
    }

    // Helper with no image argument self-captures; a cancelled selection is not an error.
    if (!imagePath && /screenshot cancelled|no image on pasteboard/i.test(combined)) {
      return undefined;
    }

    // The file exists but the helper could not decode it as an image —
    // a dismissed/empty selection, a transient capture failure, or a missing
    // Screen Recording grant. Surface it as "couldn't read the screenshot"
    // with the binary's own message attached for diagnosis.
    if (/failed to (read|convert) image/i.test(combined)) {
      throw new ScreenRecordingPermissionError(
        `recognizeText: ${(stderr || message).replace(/\s+/g, " ").trim().slice(0, 80)}`,
      );
    }

    throw new OcrError(stderr.trim() || message);
  }
}

function execErrorCode(error: unknown): number | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "number" ? code : undefined;
  }

  return undefined;
}

function execErrorStderr(error: unknown): string {
  if (error && typeof error === "object" && "stderr" in error) {
    const stderr = (error as { stderr?: unknown }).stderr;
    if (typeof stderr === "string") return stderr;
    if (Buffer.isBuffer(stderr)) return stderr.toString("utf8");
  }

  return "";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return String(error).trim() || "Unknown error";
}
