import { pickColor } from "swift:../../swift/contrast-picker";

/** Opens the native macOS eyedropper. Resolves to `#rrggbb`, or `undefined` if the user pressed Escape. */
export async function pickHex(): Promise<string | undefined> {
  const hex = await pickColor();
  return hex ?? undefined;
}
