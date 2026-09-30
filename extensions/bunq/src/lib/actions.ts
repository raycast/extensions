/**
 * Reusable action helpers for the bunq Raycast extension.
 */

import { Clipboard, showHUD } from "@raycast/api";

/**
 * Copies text to the clipboard and shows a HUD confirmation.
 *
 * @param text - The text to copy
 * @param label - The label to show in the HUD (e.g., "IBAN", "amount")
 *
 * @example
 * ```tsx
 * <Action
 *   title="Copy IBAN"
 *   icon={Icon.Clipboard}
 *   onAction={() => copyToClipboard(iban, "IBAN")}
 * />
 * ```
 */
export async function copyToClipboard(text: string, label: string): Promise<void> {
  await Clipboard.copy(text);
  await showHUD(`Copied ${label}`);
}

/**
 * Creates a clipboard copy handler for use in action callbacks.
 *
 * @param text - The text to copy
 * @param label - The label to show in the HUD
 * @returns An async function suitable for onAction handlers
 *
 * @example
 * ```tsx
 * <Action
 *   title="Copy Amount"
 *   icon={Icon.Clipboard}
 *   onAction={createCopyHandler(payment.amount.value, "amount")}
 * />
 * ```
 */
export function createCopyHandler(text: string, label: string): () => Promise<void> {
  return () => copyToClipboard(text, label);
}
