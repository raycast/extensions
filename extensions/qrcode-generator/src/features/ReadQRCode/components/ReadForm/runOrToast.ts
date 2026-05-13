import { showToast, Toast } from "@raycast/api";
import type { DecodeAction, ImageSource } from "../../types";

const FAILURE_TITLES: Record<Exclude<ImageSource, "file">, string> = {
  screenshot: "Screenshot failed",
  clipboard: "Clipboard read failed",
};

async function safeFailureToast(title: string, message: string) {
  try {
    await showToast({ style: Toast.Style.Failure, title, message });
  } catch {
    /* swallow secondary toast errors */
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
    await safeFailureToast(FAILURE_TITLES[source], message);
  }
}
