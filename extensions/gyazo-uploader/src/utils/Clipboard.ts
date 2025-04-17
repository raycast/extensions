import { Clipboard, PopToRootType, showHUD } from "@raycast/api";
import { getImageUrlFromGyazoLink } from "./Gyazo";

// start with https://nota.gyazo.com/ followed by 32 characters
const gyazoUrlPattern = /^https:\/\/(.*)gyazo\.com\/[a-f0-9]{32}$/;

export async function readGyazoLinksFromClipboardHistory() {
  const result: {
    permaLinkUrl: string;
    url: string;
    thumbUrl: string;
  }[] = [];
  const history = await readLatestClipboardHistory();
  const urls = history.filter((item) => item && gyazoUrlPattern.test(item));

  for await (const url of urls) {
    const res = await getImageUrlFromGyazoLink(url);

    result.push({
      url: res.url,
      permaLinkUrl: res.permalink_url,
      thumbUrl: res.thumb_url,
    });
  }

  return result;
}

async function readLatestClipboardHistory() {
  const history: string[] = [];
  for (let i = 0; i < 5; i++) {
    const text = await Clipboard.readText({
      offset: i,
    });
    if (!text) {
      continue;
    }

    history.push(text);
  }

  return history;
}

export async function copyAsMarkdownSyntax({ url, permaLinkUrl }: { url: string; permaLinkUrl: string }) {
  try {
    await Clipboard.copy(`[![Image from Gyazo](${url})](${permaLinkUrl})`);
    await showHUD("🚀 Copied as Markdown Syntax", {
      popToRootType: PopToRootType.Default,
    });
  } catch (error) {
    console.log(error);
    await showHUD("❌ Failed to copy as Markdown Syntax", {
      popToRootType: PopToRootType.Immediate,
    });
  }
}
