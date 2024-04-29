import { BrowserExtension, environment, getPreferenceValues } from "@raycast/api";
import { YoutubeTranscript } from "youtube-transcript";
import fetch from "cross-fetch";

global.fetch = fetch;

export function canAccessBrowserExtension() {
  return environment.canAccess(BrowserExtension);
}

export async function getBrowserContent() {
  if (!canAccessBrowserExtension()) {
    return null;
  }
  const promptConfig = getPreferenceValues<{
    prompt: string;
    prompt2: string;
  }>();
  let content = "";
  let prompt = "Summarize the {{content}}";
  const tabs = await BrowserExtension.getTabs();
  const activeTab = (tabs.filter((tab) => tab.active) || [])[0];
  // todo: add setting to enable/disable this feature
  if (activeTab && activeTab.url.startsWith("https://www.youtube.com/watch?v=")) {
    // not official API, so it may break in the future
    content = await YoutubeTranscript.fetchTranscript(activeTab.url, {
      lang: "en",
    }).then((transcript) => {
      return transcript.map((item) => item.text).join("\n");
    });
    prompt = promptConfig.prompt2 || prompt;
  } else {
    content = await BrowserExtension.getContent({ format: "markdown" });
    prompt = promptConfig.prompt || prompt;
  }
  // console.debug("prompt: ", prompt);
  return prompt.replace("{{content}}", content || "");
}
