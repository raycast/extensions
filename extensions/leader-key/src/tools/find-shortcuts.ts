import Fuse from "fuse.js";
import { getLeaderKeyConfig } from "../lib/config";
import { flattenShortcuts } from "../lib/shortcuts";

type Input = {
  /** Words from the shortcut's alias, label, or value. Omit to list all shortcuts. */
  query?: string;
};

/** Find Leader Key shortcuts without running them. */
export default function tool({ query }: Input) {
  const config = getLeaderKeyConfig();
  const shortcuts = config ? flattenShortcuts(config) : [];

  if (!query?.trim()) return shortcuts;

  const fuse = new Fuse(shortcuts, {
    keys: ["alias", "label", "value"],
    threshold: 0.4,
    ignoreLocation: true,
  });

  return fuse.search(query).map(({ item }) => item);
}
