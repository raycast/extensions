export type KeyModifier = "command" | "shift" | "option" | "control";

/** macOS virtual key codes. Unlike `keystroke`, they don't depend on the keyboard layout. */
export const KeyCode = { V: 9, Tab: 48, Return: 36 } as const;

/** AppleScript that presses a key in the frontmost app through System Events. */
export function keyPressScript(keyCode: number, modifiers: KeyModifier[] = []): string {
  const using = modifiers.length > 0 ? ` using {${modifiers.map((modifier) => `${modifier} down`).join(", ")}}` : "";
  return `tell application "System Events" to key code ${keyCode}${using}`;
}

/** Errors System Events returns when Raycast isn't allowed to control the computer (Accessibility or Automation). */
export function isPermissionError(message: string): boolean {
  return /not allowed|not authori[sz]ed|\(-1743\)|\(-25211\)|\(1002\)/i.test(message);
}
