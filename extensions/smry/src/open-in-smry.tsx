import { Clipboard, LaunchProps, open, showHUD } from "@raycast/api";
import { getSmryUrl, isValidUrl, normalizeUrl } from "./api";

interface Arguments {
  url: string;
}

export default async function OpenInSmry(props: LaunchProps<{ arguments: Arguments }>) {
  let url = props.arguments.url?.trim() || "";

  // If no URL argument, try clipboard
  if (!url) {
    const text = await Clipboard.readText();
    url = text?.trim() || "";
  }

  if (url) url = normalizeUrl(url);

  if (!url || !isValidUrl(url)) {
    await showHUD("No valid URL provided or found in clipboard");
    return;
  }

  await open(getSmryUrl(url));
  await showHUD(`Opening in SMRY: ${url}`);
}
