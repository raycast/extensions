import {
  Clipboard,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { runAction } from "./lib/action";
import { clipboardMarkdown, titleFromClipboard } from "./lib/format";
import type { ExtensionPreferences } from "./lib/types";
import { openYapsWithFallback } from "./lib/yaps-app";
import { createClipboardNote, YapsCliNotFoundError } from "./lib/yaps-cli";

const MAX_CLIPBOARD_BYTES = 8 * 1024 * 1024;

export default async function SaveClipboardCommand() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Reading clipboard…",
  });

  let content: string | undefined;
  try {
    content = await Clipboard.readText();
  } catch {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn’t read the clipboard";
    toast.message = "Copy the text again, then try again.";
    toast.primaryAction = {
      title: "Try Again",
      onAction: retrySaveSafely,
    };
    return;
  }

  if (typeof content !== "string" || !content.trim()) {
    toast.style = Toast.Style.Failure;
    toast.title = "Clipboard is empty";
    toast.message = "Copy some text, then try again.";
    return;
  }

  if (Buffer.byteLength(content, "utf8") > MAX_CLIPBOARD_BYTES) {
    toast.style = Toast.Style.Failure;
    toast.title = "Clipboard text is too large";
    toast.message = "Keep the capture under 8 MB, or copy a smaller selection.";
    return;
  }

  toast.title = "Saving clipboard to Yaps…";

  let preferences: ExtensionPreferences;
  try {
    preferences = getPreferenceValues<ExtensionPreferences>();
    if (typeof preferences.captureFolder !== "string" || !preferences.captureFolder.trim()) {
      throw new Error("Clipboard capture folder is empty.");
    }
  } catch {
    showPreferencesError(toast);
    return;
  }

  try {
    const note = await createClipboardNote(
      titleFromClipboard(content),
      clipboardMarkdown(content),
      preferences.captureFolder,
    );
    toast.style = Toast.Style.Success;
    toast.title = "Saved to Yaps";
    toast.message = note.path;
    toast.primaryAction = {
      title: "Open Yaps",
      onAction: openYapsSafely,
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn’t save to Yaps";
    const details = errorMessage(error, "Unexpected error");
    toast.message =
      error instanceof YapsCliNotFoundError
        ? details
        : `${details} Check Yaps before trying again; the note may already have been created.`;
    if (error instanceof YapsCliNotFoundError) {
      toast.primaryAction = {
        title: "Open Preferences",
        onAction: openPreferencesSafely,
      };
      toast.secondaryAction = {
        title: "Open Yaps",
        onAction: openYapsSafely,
      };
    } else {
      toast.primaryAction = {
        title: "Open Yaps",
        onAction: openYapsSafely,
      };
      toast.secondaryAction = {
        title: "Open Preferences",
        onAction: openPreferencesSafely,
      };
    }
  }
}

function showPreferencesError(toast: Toast): void {
  toast.style = Toast.Style.Failure;
  toast.title = "Check Yaps preferences";
  toast.message = "Choose a capture folder in this extension’s preferences, then try again.";
  toast.primaryAction = {
    title: "Open Preferences",
    onAction: openPreferencesSafely,
  };
}

function retrySaveSafely(): void {
  void SaveClipboardCommand().catch(() => undefined);
}

function openYapsSafely(): void {
  void runAction("Could not open Yaps", openYapsWithFallback).catch(() => undefined);
}

function openPreferencesSafely(): void {
  void openExtensionPreferences().catch(() => undefined);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}
