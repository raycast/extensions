// Apple Notes: the notes in View → Recent Notes, most recent first (Notes keeps up to 10). Notes has no tabs, and
// this list of notes recently shown is the closest to them; the first is the note open in the main window. The
// menu is read through Accessibility without opening it; its items are found by identifier ("showRecentNote:",
// the item's action), since titles are localized. Each is titled with the note's name, which Notes cuts with "…"
// just like AppleScript's `name` of the note.
//
// Selecting asks Notes' AppleScript to `show` the one note with that name: ~0.25s, and it brings back a hidden or
// closed main window. Names can repeat ("New Note"); then the menu item is pressed by position, which Notes only
// allows while it's frontmost with a window (~1s after it comes forward). See ADR-035.

import { quote } from "../applescript";
import { TabGoneError, type App, type MenuItem, type Platform, type Tab, type TabSource } from "../model";
import { windows } from "./windows";

const RECENT_NOTE = "showRecentNote:";
/** "Clear Menu", always in the menu (disabled when it's empty): tells an empty list from a missing menu. */
const CLEAR = "clearRecentNotes:";

interface Ref {
  name: string;
  /** Position in the Recent Notes menu, which tells same-named notes apart. */
  index: number;
}

export function fromMenu(app: App, items: MenuItem[]): Tab<Ref>[] {
  const recent = items.filter((i) => i.identifier === RECENT_NOTE && i.title !== "");
  const seen = new Map<string, number>();
  return recent.map((item, index) => {
    const n = seen.get(item.title) ?? 0;
    seen.set(item.title, n + 1);
    return {
      key: `${app.bundleId}:note:${item.title}:${n}`,
      app,
      source: notes.id,
      kind: "tab",
      title: item.title,
      active: index === 0,
      ref: { name: item.title, index },
    };
  });
}

/** Shows the note named `name` if exactly one has it: "ok", else how many do. */
const show = (name: string) => `set found to notes whose name is ${quote(name)}
if (count of found) is 1 then
  show item 1 of found
  return "ok"
end if
return (count of found) as text`;

export const notes: TabSource<Ref> = {
  id: "notes",
  bundleIds: ["com.apple.Notes"],
  list: async (app, platform) => {
    const items = await platform.menuItems(app.bundleId, [RECENT_NOTE, CLEAR]);
    const tabs = fromMenu(app, items);
    if (tabs.length > 0) return tabs;
    if (items.length === 0 && (await platform.accessibilityTrusted())) {
      platform.reportError(new Error("Recent Notes menu not found"), "tabs: notes");
    }
    // Never used, cleared, or the menu wasn't found (no Accessibility, or Notes changed): its windows instead.
    return (await windows.list(app, platform)) as Tab[] as Tab<Ref>[];
  },
  select: async (tab, platform) => {
    const { name, index } = tab.ref;
    const result = await platform.runAppleScript(`tell application id "com.apple.Notes"\n${show(name)}\nend tell`);
    if (result === "ok") return;
    if (await pressRecent(tab.app, name, index, platform)) return;
    throw new TabGoneError("No longer in Recent Notes");
  },
};

async function pressRecent(app: App, name: string, index: number, platform: Platform): Promise<boolean> {
  if (await platform.pressMenuItem(app.bundleId, RECENT_NOTE, name, index)) return true;
  // No window to bring forward (Notes' main window was closed): reopen it like a Dock click, then try again.
  await platform.openUrl(app.path);
  return platform.pressMenuItem(app.bundleId, RECENT_NOTE, name, index);
}
