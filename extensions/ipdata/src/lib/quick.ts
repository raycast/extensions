// Shared by the two no-view commands: find an IP in a piece of text, look it up and show the
// result as a HUD. Nothing is written to the clipboard.
import { showHUD, showToast, Toast } from "@raycast/api";
import { cachedLookup } from "./cache";
import { extract, reservedLabel } from "./ip";
import { operatorLine, placeOf } from "./present";
import { getSettings } from "./settings";

export async function quickLookup(text: string, where: string): Promise<void> {
  const ip = extract(text);
  if (!ip) {
    const snippet = text.trim().replace(/\s+/g, " ").slice(0, 60);
    await showToast({
      style: Toast.Style.Failure,
      title: `No IP address in the ${where}`,
      message: snippet ? `“${snippet}${text.trim().length > 60 ? "…" : ""}”` : `The ${where} is empty`,
    });
    return;
  }
  const reserved = reservedLabel(ip);
  if (reserved) {
    await showHUD(`🔒 ${ip} · ${reserved}`);
    return;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: `Looking up ${ip}…` });
  const res = await cachedLookup(ip, getSettings());
  if (!res.ok) {
    toast.style = Toast.Style.Failure;
    toast.title = `Could not look up ${ip}`;
    toast.message = res.message;
    return;
  }
  const m = res.model;
  await showHUD(`${m.emoji || "🌐"} ${ip} · ${placeOf(m).short} · ${operatorLine(m)}`);
}
