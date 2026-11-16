import { Keyboard } from "@raycast/api";

const cmdShift = (key: Keyboard.KeyEquivalent): Keyboard.Shortcut => ({ modifiers: ["cmd", "shift"], key });

/**
 * Every shortcut in one place so they stay consistent across views. Copy and manage actions use Raycast's
 * common shortcuts; Explore views use ⌘⇧ plus the first letter of the view.
 */
export const Shortcuts = {
  copyOrgnr: Keyboard.Shortcut.Common.Copy,
  copyName: Keyboard.Shortcut.Common.CopyName,
  copyNameAndOrgnr: Keyboard.Shortcut.Common.CopyPath,
  copyUrl: cmdShift("u"),
  openPage: Keyboard.Shortcut.Common.OpenWith,
  pasteOrgnr: cmdShift("v"),
  openBrreg: cmdShift("b"),
  openWebsite: Keyboard.Shortcut.Common.Open,
  favourite: Keyboard.Shortcut.Common.Pin,
  removeRecent: Keyboard.Shortcut.Common.Remove,
  clearRecents: Keyboard.Shortcut.Common.RemoveAll,
  moveUp: Keyboard.Shortcut.Common.MoveUp,
  moveDown: Keyboard.Shortcut.Common.MoveDown,
  toggleDetail: { modifiers: ["cmd"], key: "d" } as Keyboard.Shortcut,
  refresh: Keyboard.Shortcut.Common.Refresh,

  shareholders: cmdShift("s"),
  holdings: cmdShift("h"),
  roles: cmdShift("r"),
  financials: cmdShift("f"),
  group: cmdShift("g"),
  announcements: cmdShift("a"),
  history: cmdShift("y"),
  grants: cmdShift("n"),
  tenders: cmdShift("t"),
  ipRights: cmdShift("i"),
  licences: cmdShift("l"),
} satisfies Record<string, Keyboard.Shortcut>;
