import {
  Clipboard,
  Toast,
  getPreferenceValues,
  getSelectedFinderItems,
  getSelectedText,
  showToast,
} from "@raycast/api";
import { readFile, stat } from "node:fs/promises";
import {
  createDefaultsFromPreferences,
  type PoofPreferences,
} from "./lib/preferences";
import { createSelectedPoof } from "./lib/selection";

const http = (input: string, init?: RequestInit) => fetch(input, init);

export default async function Command() {
  const preferences = getPreferenceValues<PoofPreferences>();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Creating Poof",
  });
  try {
    await createSelectedPoof(
      {
        http,
        clipboard: Clipboard,
        getSelectedText,
        getSelectedFinderItems,
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
