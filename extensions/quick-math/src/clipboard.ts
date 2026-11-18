import { Clipboard, environment } from "@raycast/api";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIRECTORY = path.join(environment.supportPath, "output");
const CLIPBOARD_PATH = path.join(OUTPUT_DIRECTORY, "formula.png");

export async function copyPngToClipboard(image: Buffer) {
  await fs.mkdir(OUTPUT_DIRECTORY, { recursive: true });

  const temporaryPath = path.join(OUTPUT_DIRECTORY, `formula-${randomUUID()}.tmp`);

  try {
    await fs.writeFile(temporaryPath, image);
    await fs.rename(temporaryPath, CLIPBOARD_PATH);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }

  await Clipboard.copy({ file: CLIPBOARD_PATH });
}
