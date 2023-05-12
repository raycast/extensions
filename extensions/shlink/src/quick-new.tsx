import { Clipboard, getPreferenceValues, getSelectedText, LaunchProps, showHUD } from "@raycast/api";
import fetch from "node-fetch";

interface Props {
  url: string;
}

export default async function QuickNew(props: LaunchProps<{ arguments: Props }>) {
  async function selected() {
    try {
      return await getSelectedText();
    } catch (e) {
      console.error(e);
      return "";
    }
  }

  async function fromClipboard() {
    try {
      return await Clipboard.readText();
    } catch (e) {
      console.error(e);
      return "";
    }
  }

  const urls = [props.arguments.url, await selected(), await fromClipboard()]
    .filter((u) => u)
    .filter((u) => {
      try {
        new URL(u || "");
        return true;
      } catch {
        return false;
      }
    });
  if (urls.length === 0) return await showHUD("⚠️ Can't find URL");
  const url = urls[0] as string;
  const pref = getPreferenceValues<Preferences>();
  const data = await fetch(`${pref.shlinkUrl}/rest/v3/short-urls`, {
    method: "POST",
    headers: {
      "X-Api-Key": pref.shlinkApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      longUrl: url,
    }),
  });
  if (!data.ok) {
    return await showHUD("⚠️ Failed to create short URL");
  }
  const json = (await data.json()) as {
    shortCode: string;
    shortUrl: string;
    longUrl: string;
  };
  await Clipboard.copy({ text: json.shortUrl, html: `<a href="${json.shortUrl}">${json.shortUrl}</a>` });

  await showHUD("✅ Created short URL: " + json.shortUrl);
}
