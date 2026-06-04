import { Clipboard, open, showHUD, showToast, Toast } from "@raycast/api";

type Platform = {
  name: string;
  pattern: RegExp;
  convert: (url: string) => string;
  frontend: string;
};

const platforms: Platform[] = [
  {
    name: "X/Twitter",
    pattern:
      /^https?:\/\/(www\.)?(twitter\.com|x\.com|mobile\.twitter\.com)\/.*$/i,
    convert: (url) =>
      url.replace(/(twitter\.com|x\.com|mobile\.twitter\.com)/i, "xcancel.com"),
    frontend: "xcancel.com",
  },
  {
    name: "Instagram",
    pattern: /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/i,
    convert: (url) => {
      const match = url.match(/instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/i);
      if (match) {
        const postId = match[2];
        return `https://imginn.com/p/${postId}/`;
      }
      return url;
    },
    frontend: "imginn.com",
  },
];

export default async function Command() {
  const clipboard = await Clipboard.readText();

  if (!clipboard) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Clipboard is empty",
    });
    return;
  }

  const platform = platforms.find((p) => p.pattern.test(clipboard));

  if (!platform) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No supported URL in clipboard",
      message: "Supported: X/Twitter, Instagram",
    });
    return;
  }

  const convertedUrl = platform.convert(clipboard);

  try {
    await open(convertedUrl);
    await showHUD(`Opened via ${platform.frontend}`);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open URL",
      message: convertedUrl,
    });
  }
}
