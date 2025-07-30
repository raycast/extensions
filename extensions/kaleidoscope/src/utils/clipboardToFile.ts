import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fsPromise from "node:fs/promises";
import { Clipboard } from "@raycast/api";
import { nanoid } from "nanoid";

const generateId = () => nanoid(10);
const PREFIX = "REKaleidoscope-Clipboard-";
const SUFFIX = "-item.txt";
const TMP_DIR = os.tmpdir();

export async function clipboardToFilePath(clipboardContent: Clipboard.ReadContent, localId: string): Promise<string> {
  if (clipboardContent.file) {
    const filePath = clipboardContent.file.startsWith("file://")
      ? decodeURI(fileURLToPath(clipboardContent.file))
      : clipboardContent.file;
    return filePath;
  }

  if (clipboardContent.text) {
    const filePath = path.join(TMP_DIR, `${PREFIX}${generateId()}-${localId}${SUFFIX}`);

    try {
      await fsPromise.writeFile(filePath, clipboardContent.text);
    } catch (error) {
      throw new Error(`Could not store Clipboard (${localId}) content to temporary file`);
    }

    return filePath;
  }

  throw new Error("Clipboard content is empty");
}
