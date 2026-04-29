import { Clipboard } from "@raycast/api";
import { looksLikeUrl, normalizeUrl } from "./url";

export async function resolveUrlFromArgOrClipboard(
  argUrl: string | undefined,
): Promise<string | null> {
  const arg = argUrl?.trim();
  if (arg && looksLikeUrl(arg)) return normalizeUrl(arg);

  try {
    const text = (await Clipboard.readText())?.trim() ?? "";
    if (looksLikeUrl(text)) return normalizeUrl(text);
  } catch (err) {
    console.error("[web-to-md] Clipboard.readText() failed:", err);
  }

  return null;
}
