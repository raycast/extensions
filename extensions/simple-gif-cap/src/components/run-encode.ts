import { showToast, Toast } from "@raycast/api";
import { formatSize } from "../lib/encode";
import { Capture } from "../lib/history";

export type CaptureUpdate = (next: Capture | undefined) => void;

export async function runEncode(label: string, work: () => Promise<Capture>, onUpdate: CaptureUpdate) {
  const toast = await showToast({ style: Toast.Style.Animated, title: label });
  try {
    const next = await work();
    onUpdate(next);
    toast.style = Toast.Style.Success;
    toast.title = "GIF copied to clipboard";
    toast.message = formatSize(next.size ?? 0);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Encoding failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
