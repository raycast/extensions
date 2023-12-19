import { Clipboard, open } from "@raycast/api";

const isValidUrl = (url: string) => {
  try {
    return Boolean(new URL(url));
  } catch (e) {
    return false;
  }
};

const openAllUrls = async () => {
  const { text } = await Clipboard.read();

  const urls = text.split("\n").map((_raw) => _raw.trim());

  for (const url of urls) {
    if (!isValidUrl(url)) continue;

    await open(url);
  }
};

export default openAllUrls;
