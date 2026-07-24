import { Clipboard, LaunchProps, Toast, getPreferenceValues, getSelectedText, showHUD, showToast } from "@raycast/api";
import { U2L, U2LApiError } from "@u2l/sdk";

interface Preferences {
  apiKey: string;
}

/** Accept only absolute http(s) URLs; everything else is noise from the clipboard. */
function asUrl(text: string | undefined): string | null {
  const candidate = text?.trim();
  return candidate && /^https?:\/\/\S+$/i.test(candidate) ? candidate : null;
}

export default async function shorten(props: LaunchProps<{ arguments: { url?: string } }>) {
  const { apiKey } = getPreferenceValues<Preferences>();

  let url = asUrl(props.arguments.url);
  if (!url) {
    const selected = await getSelectedText().catch(() => undefined);
    url = asUrl(selected);
  }
  if (!url) {
    const clipboard = await Clipboard.readText().catch(() => undefined);
    url = asUrl(clipboard);
  }
  if (!url) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No URL found",
      message: "Type one, select one, or copy one first",
    });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Shortening…" });
  try {
    const client = new U2L({ apiKey });
    const link = await client.links.create({ url });
    const shortLink = link.shortLink || `https://${link.domain}/${link.slug}`;
    await Clipboard.copy(shortLink);
    await showHUD(`Copied ${shortLink}`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not shorten";
    toast.message = error instanceof U2LApiError ? error.message : String(error);
  }
}
