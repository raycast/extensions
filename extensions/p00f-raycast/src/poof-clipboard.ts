import { Clipboard, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { readFile, stat } from "node:fs/promises";
import { createClipboardPoof } from "./lib/clipboard";
import { createDefaultsFromPreferences } from "./lib/preferences";

const http = (input: string, init?: RequestInit) => fetch(input, init);

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Creating Poof",
  });
  try {
    await createClipboardPoof(
      {
        http,
        clipboard: Clipboard,
        readClipboard: () =>
          Clipboard.read() as Promise<{
            text?: string;
            file?: string;
            html?: string;
          }>,
        statPath: async (path) => {
          const s = await stat(path);
          return { isFile: s.isFile(), isDirectory: s.isDirectory() };
        },
        readFile: async (path) => new Uint8Array(await readFile(path)),
      },
      createDefaultsFromPreferences(preferences),
    );
    toast.style = Toast.Style.Success;
    toast.title = preferences.pasteAfterCreate
      ? "Poof link pasted"
      : "Poof link copied";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title =
      error instanceof Error ? error.message : "Could not create Poof";
  }
}
