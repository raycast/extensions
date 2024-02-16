import { runAppleScript, showFailureToast } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { composeApplescript } from "./compose-applescript";
import { TabOpenerArguments } from "./types";

function sanitizeInput(input: string): string {
  const disallowedChars = /[^a-zA-Z0-9,./?=\- %:#&;_\r\n]/g;

  const sanitizedInput = input.replace(disallowedChars, "");

  return sanitizedInput;
}

export async function openBrowserTab({ browserName, prompt, gptUrl, query }: TabOpenerArguments): Promise<boolean> {
  try {
    const correctBrowserName = sanitizeInput(browserName);
    const correctPrompt = sanitizeInput(prompt + "\n\n" + query);
    const correctGptUrl = sanitizeInput(gptUrl);
    const appleScript = composeApplescript({
      browserName: correctBrowserName,
      prompt: correctPrompt,
      gptUrl: correctGptUrl,
    });

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening ChatGPT",
    });

    const jsResult = await runAppleScript(appleScript);
    toast.style = Toast.Style.Success;
    toast.title = "ChatGPT has opened. Asking...";

    return !!jsResult;
  } catch (error) {
    await showFailureToast(error, { title: "Could not run AppleScript" });

    return false;
  }
}
