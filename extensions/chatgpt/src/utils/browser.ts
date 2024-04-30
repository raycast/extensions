import { BrowserExtension, environment, getPreferenceValues } from "@raycast/api";
import { YoutubeTranscript } from "youtube-transcript";
import fetch from "cross-fetch";
import * as fs from "node:fs";

global.fetch = fetch;

export function canAccessBrowserExtension() {
  return environment.canAccess(BrowserExtension);
}

const DEFAULT_PROMPT = `Summarize the text below and give me a list of bullet points with key insights and the most important facts.

{{content}}
`;

export async function getBrowserContent() {
  if (!canAccessBrowserExtension()) {
    return null;
  }
  const promptConfig = getPreferenceValues<{
    promptTemplate?: string;
    promptTemplate2?: string;
  }>();

  // console.debug("promptConfig: ", promptConfig)
  const promptTemplate = readFile(promptConfig.promptTemplate);
  const promptTemplate2 = readFile(promptConfig.promptTemplate2);

  let content: string;
  let prompt: string;

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
    prompt = promptTemplate2 || DEFAULT_PROMPT;
  } else {
    content = await BrowserExtension.getContent({ format: "markdown" });
    prompt = promptTemplate || DEFAULT_PROMPT;
  }
  // console.debug("prompt: ", prompt);
  return prompt.replace("\\n", "\n").replace("{{content}}", content || "");
}

function readFile(path?: string) {
  if (!path) {
    return "";
  }
  return fs.readFileSync(path, "utf-8");
}
