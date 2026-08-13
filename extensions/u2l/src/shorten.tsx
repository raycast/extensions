import { Clipboard, LaunchProps, Toast, getPreferenceValues, getSelectedText, showHUD, showToast } from "@raycast/api";
import { U2L } from "@u2l/sdk";
import { showApiFailureToast } from "./errors";

/** Accept only absolute http(s) URLs; everything else is noise from the clipboard. */
function asUrl(text: string | undefined): string | null {
  const candidate = text?.trim();
  return candidate && /^https?:\/\/\S+$/i.test(candidate) ? candidate : null;
}

export default async function shorten(props: LaunchProps<{ arguments: Arguments.Shorten }>) {
  const { apiKey } = getPreferenceValues<Preferences.Shorten>();

  const argumentText = props.arguments.url?.trim();
  let url = asUrl(argumentText);
  if (argumentText && !url) {
    // An explicit argument that isn't a URL is an error, never a fall-through
    // to whatever happens to be selected or on the clipboard.
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid URL",
      message: "Only http(s) URLs can be shortened",
    });
    return;
  }
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
    await toast.hide();
    await showHUD(`Copied ${shortLink}`);
  } catch (error) {
    await toast.hide();
    await showApiFailureToast(error, "Could not shorten");
  }
}
