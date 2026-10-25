import { showHUD } from "@raycast/api";
import { attempt } from "./components";
import { closeTab, readWindow, Tab } from "./yab";

/** Copies of a page among today's tabs; pins and kept tabs always stay, and so does the one in front. */
export function duplicates(tabs: Tab[]): Tab[] {
  const norm = (u: string) => u.replace(/#.*$/, "").replace(/\/$/, "");
  const keep = new Map<string, Tab>();
  for (const t of tabs) {
    const key = norm(t.url);
    const held = keep.get(key);
    if (
      !held ||
      (t.location !== "unpinned" && held.location === "unpinned") ||
      (t.active && held.location === "unpinned")
    ) {
      keep.set(key, t);
    }
  }
  return tabs.filter((t) => t.location === "unpinned" && keep.get(norm(t.url)) !== t && /^https?:/.test(t.url));
}

export default async function Command() {
  await attempt("Couldn't close the copies", async () => {
    const window = await readWindow();
    const extra = duplicates(window?.tabs ?? []);
    for (const t of extra) await closeTab(t.id);
    await showHUD(
      extra.length === 0
        ? "No duplicates"
        : `Closed ${extra.length} ${extra.length === 1 ? "duplicate" : "duplicates"}`,
    );
  });
}
