import { environment } from "@raycast/api";
import { execFile } from "child_process";
import fs from "fs";
import { promisify } from "util";

const binary = `${environment.assetsPath}/lang`;
const execFileAsync = promisify(execFile);

async function ensureExecutable() {
  try {
    await fs.promises.access(binary, fs.constants.X_OK);
  } catch {
    await fs.promises.chmod(binary, 0o775);
  }
}

export default async function detect(text: string): Promise<string> {
  await ensureExecutable();
  try {
    const { stdout } = await execFileAsync(binary, [text], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    return String(stdout);
  } catch (error) {
    if (error && typeof error === "object" && "stderr" in error) {
      const stderr = (error as { stderr?: unknown }).stderr;
      const message = String(stderr ?? "");
      if (message) {
        throw new Error(message);
      }
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}
