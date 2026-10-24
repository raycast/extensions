import { Clipboard, getFrontmostApplication, getSelectedFinderItems, getSelectedText } from "@raycast/api";
import { statSync } from "node:fs";
import type { Readers } from "../lib/input";

export const raycastReaders: Readers = {
  frontmostApp: async () => {
    const a = await getFrontmostApplication();
    return { name: a.name, bundleId: a.bundleId };
  },
  finderPaths: async () => (await getSelectedFinderItems()).map((i) => i.path),
  isFile: (p) => {
    try {
      return statSync(p).isFile();
    } catch {
      return false;
    }
  },
  selectedText: getSelectedText,
  clipboardText: () => Clipboard.readText(),
};
