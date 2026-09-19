/**
 * Quick Look is a macOS technology with no Windows counterpart a Raycast extension can reach:
 * PowerToys "Peek" only responds to a global hotkey in Explorer, and the Explorer preview pane is
 * not callable from outside. On Windows the PDF is opened in the default application instead.
 */
export function isMacOS(platform: string = process.platform): boolean {
  return platform === "darwin";
}
