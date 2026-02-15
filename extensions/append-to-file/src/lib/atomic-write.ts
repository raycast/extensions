import { rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

function makeTempPath(filePath: string): string {
  const directory = path.dirname(filePath);
  const base = path.basename(filePath);
  const nonce = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return path.join(directory, `.${base}.tmp-${nonce}`);
}

export async function atomicWriteFile(
  filePath: string,
  content: Buffer,
): Promise<void> {
  const tempPath = makeTempPath(filePath);
  let tempWritten = false;

  try {
    await writeFile(tempPath, content, { flag: "wx" });
    tempWritten = true;
    await rename(tempPath, filePath);
  } catch (error) {
    if (tempWritten) {
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup failure.
      }
    }

    throw error;
  }
}
