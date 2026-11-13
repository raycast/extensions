import { Keyboard } from "@raycast/api";

function cmdShift(key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    macOS: { modifiers: ["cmd", "shift"], key },
    Windows: { modifiers: ["ctrl", "shift"], key },
  };
}

function cmd(key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    macOS: { modifiers: ["cmd"], key },
    Windows: { modifiers: ["ctrl"], key },
  };
}

export const shortcuts = {
  pin: Keyboard.Shortcut.Common.Pin,
  moveUp: Keyboard.Shortcut.Common.MoveUp,
  moveDown: Keyboard.Shortcut.Common.MoveDown,
  edit: Keyboard.Shortcut.Common.Edit,
  create: Keyboard.Shortcut.Common.New,
  remove: Keyboard.Shortcut.Common.Remove,
  copyIban: Keyboard.Shortcut.Common.Copy,
  refresh: Keyboard.Shortcut.Common.Refresh,
  convert: Keyboard.Shortcut.Common.Open,
  copyRate: Keyboard.Shortcut.Common.Copy,
  open: Keyboard.Shortcut.Common.Open,
  // The usual shortcut for preferences, as in other menu bar commands.
  configureCommand: cmd(","),
  // No common equivalents for these.
  copyBalance: cmdShift("b"),
  copyTotal: cmdShift("t"),
  copyGoal: cmdShift("g"),
  toggleDetails: cmdShift("d"),
  copyAmount: cmdShift("a"),
  changePeriod: cmdShift("p"),
  viewStatement: cmdShift("s"),
  exportCsv: cmdShift("e"),
  showInMenuBar: cmdShift("m"),
  copyRequisites: cmdShift("r"),
  manageBudgets: cmdShift("u"),
  chooseAccounts: cmdShift("o"),
  showHidden: cmdShift("h"),
} satisfies Record<string, Keyboard.Shortcut>;
