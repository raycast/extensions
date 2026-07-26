import { Clipboard } from "@raycast/api";
import { looksLikeUrl, normalizeUrl, tryNormalizeUrl } from "./url";

export async function resolveUrlFromArgOrClipboard(argUrl: string | undefined): Promise<string | null> {
  // An explicit argument is intentional, so accept scheme-less input like
  // "example.com". Clipboard text stays strict below — we don't want arbitrary
  // copied prose being coerced into a URL.
  const fromArg = tryNormalizeUrl(argUrl);
  if (fromArg) return fromArg;

  try {
    const text = (await Clipboard.readText())?.trim() ?? "";
    if (looksLikeUrl(text)) return normalizeUrl(text);
  } catch (err) {
    console.error("[web-to-md] Clipboard.readText() failed:", err);
  }

  return null;
}
