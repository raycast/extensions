import { environment } from "@raycast/api";
import { chmod } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function recognizeText(imagePath?: string): Promise<string | undefined> {
  const command = join(environment.assetsPath, "recognizeText");
  await chmod(command, "755");

  try {
    const { stdout } = await execFileAsync(command, imagePath ? [imagePath] : [], {
      timeout: 90_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    const text = stdout.trim();
    return text.length > 0 ? text : undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = execErrorCode(error);
    if (code === 2 || (!imagePath && /screenshot cancelled|no image on pasteboard/i.test(message))) {
      return undefined;
    }

    throw error;
  }
}

function execErrorCode(error: unknown): number | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "number" ? code : undefined;
  }

  return undefined;
}
