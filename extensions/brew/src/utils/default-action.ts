/**
 * Install and Uninstall each have a Run … in Terminal twin, and each pair fills
 * two slots in the action panel. "first" is the slot ↩ runs for Install, and
 * the slot that holds ⌃X for Uninstall. "terminal" sits beside the copy actions.
 */
export type ActionSlot = "first" | "terminal";

/**
 * Whether `slot` holds the Run … in Terminal action. The preference to install
 * and uninstall in the terminal moves it to the first slot.
 *
 * A pinned package ignores the preference. brew refuses to uninstall it without
 * `--force`, which the command builder does not add, so the panel shows no
 * terminal uninstall and ⌃X stays the Uninstall that asks to unpin.
 */
export function slotRunsInTerminal(slot: ActionSlot, inTerminalByDefault: boolean, pinned = false): boolean {
  return (slot === "first") === (inTerminalByDefault && !pinned);
}
