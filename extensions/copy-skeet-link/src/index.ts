import { showHUD, Clipboard } from "@raycast/api";

function transformUrl(url: string): string {
  const urlObj = new URL(url);

  // Change the host of the URL to skeeet.xyz
  urlObj.host = "skeeet.xyz";

  return urlObj.toString();
}

export default async function main() {
  const input = await Clipboard.read();

  if (!input.text.includes("bsky.app")) {
    await showHUD("Only bsky.app links are supported");
    return;
  }

  if (!input) {
    await showHUD("No input found");
    return;
  }

  const transformed = transformUrl(input.text);

  Clipboard.copy(transformed);
  await showHUD("Copied to clipboard");
}
