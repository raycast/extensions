import { runAppleScript, showFailureToast } from "@raycast/utils";
import { showToast, Toast, Cache } from "@raycast/api";
import { composeApplescript } from "./compose-applescript";
import { TabOpenerArguments } from "./types";
import { randomUUID } from "node:crypto";

const cache = new Cache();

function sanitizeInput(input: string): string {
  const disallowedChars = /[^a-zA-Z0-9,./?=\- %:#&;_\r\n]/g;

  const sanitizedInput = input.replace(disallowedChars, "");

  return sanitizedInput;
}

export function composeUrlWithRandomId(gptUrl: TabOpenerArguments["gptUrl"]): string {
  const id = randomUUID();

  const url = new URL(gptUrl);
  url.searchParams.set("_qchat-id", id);

  return url.toString();
}

// Reusing the same tab makes sense only if the provided URL is the specific conversation
// if the provided URL leads to custom GPT, the conversation URL will be automatically created by ChatGPT app and set into the browser URL.
function getIsUrlEligibleForReusingSameTab(gptUrl: TabOpenerArguments["gptUrl"]): boolean {
  return gptUrl.startsWith("https://chat.openai.com/c/");
}

export async function openBrowserTab({ browserName, prompt, gptUrl, query }: TabOpenerArguments): Promise<boolean> {
  try {
    const correctBrowserName = sanitizeInput(browserName);
    const correctPrompt = sanitizeInput(prompt + "\n\n" + query);
    const correctGptUrl = sanitizeInput(gptUrl);
    const newUrlToOpen = composeUrlWithRandomId(correctGptUrl);

    let urlToSearch = newUrlToOpen;
    const isUrlEligibleForReusingSameTab = getIsUrlEligibleForReusingSameTab(gptUrl);
    console.debug({ isUrlEligibleForReusingSameTab, gptUrl });

    if (isUrlEligibleForReusingSameTab) {
      const cachedUrl = cache.get(gptUrl);
      console.debug("cache retrieved", { gptUrl, cachedUrl });
      if (cachedUrl) {
        urlToSearch = cachedUrl;
      }
    }

    const appleScript = composeApplescript({
      browserName: correctBrowserName,
      prompt: correctPrompt,
      urlToOpen: newUrlToOpen,
      urlToSearch,
    });

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening ChatGPT",
    });

    console.debug("running applescript");
    const openedUrl = await runAppleScript(appleScript);

    if (isUrlEligibleForReusingSameTab) {
      console.debug("setting cache", { openedUrl });
      cache.set(gptUrl, openedUrl);
    }

    toast.style = Toast.Style.Success;
    toast.title = "ChatGPT has opened. Asking...";

    return !!openedUrl;
  } catch (error) {
    console.error(error);
    await showFailureToast(error, { title: "Could not run AppleScript" });

    return false;
  }
}
