import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { existsSync } from "fs";
import { airDropItems, describeItems, fileUrlToPath, isHttpUrl, writeTempTextFile } from "./lib/airdrop";

type ResolvedClipboard = { items: string[]; cleanup?: () => void };

async function resolveClipboardItems(): Promise<ResolvedClipboard> {
  const { file, text } = await Clipboard.read();

  if (file) {
    const path = fileUrlToPath(file);
    if (existsSync(path)) return { items: [path] };
  }

  if (text && text.trim().length > 0) {
    const trimmed = text.trim();
    if (isHttpUrl(trimmed)) return { items: [trimmed] };

    const { path, cleanup } = writeTempTextFile(text, "clipboard.txt");
    return { items: [path], cleanup };
  }

  return { items: [] };
}

export default async function Command() {
  let resolved: ResolvedClipboard = { items: [] };

  try {
    resolved = await resolveClipboardItems();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not read clipboard",
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  if (resolved.items.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Clipboard is empty",
    });
    return;
  }

  await showHUD(`Sharing ${describeItems(resolved.items)} via AirDrop`);

  try {
    await airDropItems(resolved.items);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "AirDrop failed",
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    resolved.cleanup?.();
  }
}
