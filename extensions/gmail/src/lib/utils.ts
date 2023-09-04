import { showToast, Toast } from "@raycast/api";
import { setTimeout } from "timers/promises";

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export function getFirstValidLetter(text: string | null | undefined, fallback?: string) {
  if (!text) {
    return;
  }
  for (const c of text) {
    if (c.match(/[a-zA-Z0-9]/)) {
      return c;
    }
  }
  return fallback;
}

export async function sleep(delayMs: number) {
  await setTimeout(delayMs);
}

export function ensureShortText(text: string, options?: { maxLength?: number }) {
  const maxLength = options?.maxLength || 80;
  if (text.length > maxLength) {
    return text.slice(0, maxLength - 4) + " ...";
  }
  return text;
}

export async function toastifiedPromiseCall(args: {
  onCall: () => Promise<void>;
  title: string;
  finishTitle: string;
  onAfterCall?: () => void;
}) {
  try {
    const toast = await showToast({ style: Toast.Style.Animated, title: args.title });
    await args.onCall();
    toast.style = Toast.Style.Success;
    toast.title = args.finishTitle;

    if (args.onAfterCall) {
      args.onAfterCall();
    }
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
  }
}
