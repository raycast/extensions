import { showHUD } from "@raycast/api";
import type { DecodeAction, ImageSource } from "../../types";

const FAILURE_TITLES: Record<Exclude<ImageSource, "file">, string> = {
  screenshot: "Screenshot failed",
  clipboard: "Clipboard read failed",
};

async function safeFailure(title: string, message: string) {
  try {
    await showHUD(`${title}: ${message}`);
  } catch {
    /* swallow secondary errors */
  }
}

export async function runOrToast(
  loadFile: () => Promise<string>,
  onDecode: DecodeAction,
  source: Exclude<ImageSource, "file">,
) {
  try {
    const filePath = await loadFile();
    await onDecode(filePath, source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await safeFailure(FAILURE_TITLES[source], message);
  }
}
