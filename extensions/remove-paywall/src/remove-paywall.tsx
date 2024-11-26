import { Clipboard, getSelectedText, BrowserExtension, open, getPreferenceValues } from "@raycast/api";

const urlRegex = /(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;

function isUrl(text: string): boolean {
  return urlRegex.test(text);
}

async function getUrl(urlArgument: string | undefined): Promise<string | Error> {
  let url: string | undefined;

  if (urlArgument) {
    url = urlArgument;
  } else {
    // Try to get the URL from selected text, clipboard, or active browser tab
    try {
      url = await getSelectedText();
    } catch {
      try {
        url = await Clipboard.readText();
      } catch {
        const tabs = await BrowserExtension.getTabs();
        const activeTab = tabs.find((tab) => tab.active);
        url = activeTab?.url;
      }
    }
  }

  if (!url) {
    return new Error("No URL provided.");
  }

  if (!isUrl(url)) {
    return new Error(`Invalid URL: "${url}"`);
  }

  return url.trim();
}

export default async function command(props: { arguments: { url?: string; service?: string } }) {
  const { url: urlArgument, service } = props.arguments;
  const preferences = getPreferenceValues<{ service: string }>();
  const selectedService = service || preferences.service;

  try {
    const url = await getUrl(urlArgument);
    if (url instanceof Error) throw url;

    const newUrl = `${selectedService}/search?url=${encodeURIComponent(url)}`;
    console.log(`Opening: ${newUrl}`);
    await open(newUrl);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
  }
}
