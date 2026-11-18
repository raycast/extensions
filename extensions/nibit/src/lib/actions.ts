import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import type { PushItem } from "./secure";
import { getSharedClient } from "./client";
import { clearAuthSession } from "./oauth";
import { isFileItem, latestPushFast } from "./push-items";
import type { LatestPushResolution } from "./latest-policy";

async function blobPathForItem(item: PushItem): Promise<string> {
  const blob = await getSharedClient().getStoredBlob(item.id);
  if (!blob?.path) throw new Error("Push file is unavailable.");
  return blob.path;
}

export async function copyPushItem(item: PushItem): Promise<void> {
  if (isFileItem(item)) {
    const path = await blobPathForItem(item);
    try {
      await Clipboard.copy({ file: path }, { concealed: true });
    } catch {
      // Fallback for apps / clipboard targets that reject file objects.
      await Clipboard.copy(path, { concealed: true });
    }
  } else {
    await Clipboard.copy(item.content, { concealed: true });
  }
  await showHUD("Copied to Clipboard");
}

export async function pastePushItem(item: PushItem): Promise<void> {
  const path = isFileItem(item) ? await blobPathForItem(item) : null;
  await closeMainWindow();

  if (path) {
    try {
      await Clipboard.paste({ file: path });
    } catch {
      // Fallback for text fields or clipboard targets that cannot accept file objects.
      await Clipboard.paste(path);
      await showHUD("Pasted file path as text");
    }
  } else {
    await Clipboard.paste(item.content);
  }
}

async function requireLatestPush(): Promise<LatestPushResolution & { item: PushItem }> {
  const resolution = await latestPushFast();
  if (!resolution.item) throw new Error("No pushed item is available.");
  return { ...resolution, item: resolution.item };
}

export async function copyLatestPush(): Promise<LatestPushResolution & { item: PushItem }> {
  const resolution = await requireLatestPush();
  await copyPushItem(resolution.item);
  return resolution;
}

export async function pasteLatestPush(): Promise<LatestPushResolution & { item: PushItem }> {
  const resolution = await requireLatestPush();
  await pastePushItem(resolution.item);
  return resolution;
}

export async function signOutAndClearLocalState(): Promise<void> {
  await clearAuthSession({ notifyRevokeFailure: true });
}
