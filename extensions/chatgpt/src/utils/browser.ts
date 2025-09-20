import { BrowserExtension, environment, getPreferenceValues } from "@raycast/api";
import { YoutubeTranscript } from "youtube-transcript";
import fetch from "cross-fetch";
import * as fs from "node:fs";
import { showFailureToast } from "@raycast/utils";

global.fetch = fetch;

export function canAccessBrowserExtension() {
  return environment.canAccess(BrowserExtension);
}

const DEFAULT_PROMPT = `Summarize the text below and give me a list of bullet points with key insights and the most important facts.

{{content}}`;

// https://i.stack.imgur.com/g2X8z.gif
const ASCII_TABLES = Object.entries({
  "&amp;": "&",
  "&#32;": " ",
  "&#33;": "!",
  "&#34;": '"',
  "&#35;": "#",
  "&#36;": "$",
  "&#37;": "%",
  "&#38;": "&",
  "&#39;": "'",
  "&#40;": "(",
  "&#41;": ")",
  "&#42;": "*",
  "&#43;": "+",
  "&#44;": ",",
  "&#45;": "-",
  "&#46;": ".",
  "&#47;": "/",
  "&#91;": "[",
  "&#92;": "\\",
  "&#93;": "]",
  "&#94;": "^",
  "&#95;": "_",
  "&#96;": "`",
  "&#123;": "{",
  "&#124;": "|",
  "&#125;": "}",
  "&#126;": "~",
});

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

  let prompt: string;

  const tabs = await BrowserExtension.getTabs();
  const activeTab = (tabs.filter((tab) => tab.active) || [])[0];

  // todo: add setting to enable/disable this feature
  if (activeTab && activeTab.url.startsWith("https://www.youtube.com/watch?v=")) {
    // not official API, so it may break in the future
    const content = await YoutubeTranscript.fetchTranscript(activeTab.url, {
      lang: "en",
    }).then((transcript) => {
      return transcript.map((item) => item.text).join("\n");
    });
    prompt = promptTemplate2 || DEFAULT_PROMPT;
    prompt = prompt.replaceAll(/\{\{\s?content.*?}}/g, content);
  } else {
    prompt = await dynamicExecution(promptTemplate || DEFAULT_PROMPT);
  }

  // console.debug("prompt: ", prompt);
  const entries = Object.entries(activeTab || []);
  return replace(prompt, entries);
}

const regex =
  /\{\{\s*content\s*(format="(?<format>markdown|text|html)")?\s*(cssSelector="(?<cssSelector>.+)")?\s*(tabId=(?<tabId>\d+))?\s*}}/gm;

/**
 * dynamic execution by the tag
 * e.g.
 * {{ content }} default to Markdown format
 * {{ content format="markdown" }}
 * {{ content format="html" }}
 * {{ content format="text" cssSelector="h1" }}
 * {{ content tabId=1 }}
 *
 * @param prompt
 */
async function dynamicExecution(prompt: string) {
  let result = prompt;
  const errors: string[] = [];
  for (const m of prompt.matchAll(regex)) {
    if (m) {
      const groups = m.groups;
      if (groups) {
        const { format, cssSelector, tabId } = groups;
        try {
          const content = await BrowserExtension.getContent({
            format: format ? (format as "markdown" | "text" | "html") : "markdown",
            cssSelector: cssSelector ? cssSelector : undefined,
            tabId: tabId ? parseInt(tabId) : undefined,
          });
          result = result.replace(m[0], content);
        } catch (error) {
          errors.push(`Tag "${m[0]}" execution failed: ${error}`);
        }
      }
    }
  }
  if (errors.length > 0) {
    await showFailureToast(errors.join("\n"), { title: "Dynamic execution failed" });
  }
  return result;
}

function replace(prompt: string, entries: [string, string][]): string {
  prompt = prompt.replace("\\n", "\n");

  let result = entries.reduce((acc, [key, value]) => {
    const r = new RegExp(`{{\\s*${key}}}\\s*`, "g");
    return acc.replaceAll(r, value);
  }, prompt);

  for (let i = 0; i < 2; i++) {
    ASCII_TABLES.forEach(([key, value]) => {
      result = result.replaceAll(key, value);
    });
  }
  return result;
}

function readFile(path?: string) {
  if (!path) {
    return "";
  }
  return fs.readFileSync(path, "utf-8");
}
