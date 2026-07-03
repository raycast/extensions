import { Clipboard, showHUD } from "@raycast/api";
import { type Charset, type Format, decode, encode, getCodec } from "./text-codec";

/**
 * Shared body for the no-view encode/decode shortcuts: read the clipboard,
 * transform it in the requested direction, write the result back, and report via
 * HUD. The shortcuts always use UTF-8 — the form command covers other charsets.
 */
export async function transformClipboard(
  format: Format,
  direction: "encode" | "decode",
  charset: Charset = "utf8",
): Promise<void> {
  const clipboard = await Clipboard.readText();
  if (!clipboard) {
    await showHUD("❌ Clipboard is empty");
    return;
  }
  try {
    const result =
      direction === "encode" ? encode(clipboard, format, charset) : decode(clipboard.trim(), format, charset);
    await Clipboard.copy(result);
    const verb = direction === "encode" ? "Encoded" : "Decoded";
    await showHUD(`✅ ${verb} clipboard (${getCodec(format).label})`);
  } catch (error) {
    await showHUD(`❌ ${error instanceof Error ? error.message : String(error)}`);
  }
}
