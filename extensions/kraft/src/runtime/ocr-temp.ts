import fs from "fs";

export async function removeOcrTempImage(path: string | undefined): Promise<void> {
  if (!path) {
    return;
  }
  try {
    await fs.promises.unlink(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Failed to remove OCR temp image:", error);
    }
  }
}
