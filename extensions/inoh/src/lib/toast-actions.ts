import { open, Toast } from "@raycast/api";
import type { Keyboard } from "@raycast/api";

/**
 * A toast action that opens a page in the browser and takes the toast away.
 *
 * Reason: a toast fades, so every offer it makes has to be taken while it is
 * still there, and taking one leaves nothing worth reading behind. One helper
 * so "open this, then dismiss" is written once.
 *
 * @param title - What the action offers, as the toast shows it
 * @param url - The page to open
 * @param shortcut - Optional key to take it without reaching for the mouse
 * @returns The action to hand to a toast
 */
export function buildOpenUrlToastAction(title: string, url: string, shortcut?: Keyboard.Shortcut): Toast.ActionOptions {
  return {
    title,
    shortcut,
    onAction: async (toast) => {
      await open(url);
      await toast.hide();
    },
  };
}
