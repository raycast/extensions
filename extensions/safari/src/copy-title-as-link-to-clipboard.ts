import { AI, Clipboard, closeMainWindow, environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getCurrentTabName, getCurrentTabURL } from "./utils";

const preferences: Preferences.CopyTitleAsLinkToClipboard = getPreferenceValues();

/* eslint-disable no-useless-escape */
async function cleanUpTitleWithAI(title: string) {
  if (!environment.canAccess(AI)) {
    return title;
  }

  return await AI.ask(`
    The user copies a link from the browser to put it in their notes. Clean up the title to make it more readable and remove unnecessary things.

    ## Examples
    - Title: "Building and Evaluating a Company Research Agent with LangChain | by Ankush k Singal | AI Artistry | Jan, 2025 | Medium"
    - Cleaned up title: "AI Artistry - Building and Evaluating a Company Research Agent with LangChain by Ankush k Singal"

    - Title: "Agents | Kaggle"
    - Cleaned up title:: "Kaggle - Agents"

    - Title: "Building effective agents \ Anthropic"
    - Cleaned up title: "Anthropic - Building effective agents"

    - Title: "Linen | Front page for your Slack and Discord Communities"
    - Cleaned up title: "Linen - Front page for your Slack and Discord Communities"

    - Title: "LibSQL - SQLite for Modern Applications"
    - Cleaned up title: "LibSQL - SQLite for Modern Applications"

    - Title: "Product Hunt - Raycast - Product Information, Latest Updates, and Reviews 2025"
    - Cleaned up title: "Product Hunt - Raycast"

    - Title: "vscode-extension-samples/chat-sample/package.json at main · microsoft/vscode-extension-samples · GitHub"
    - Cleaned up title: "GitHub - chat-sample/package.json at main (microsoft/vscode-extension-samples)"

    Respond only with the cleaned up title.
    - Title: ${title}
    - Cleaned up title:
  `);
}

export default async function Command() {
  try {
    await closeMainWindow();

    let title = await getCurrentTabName();
    const url = await getCurrentTabURL();
    if (preferences.cleanUpTitleWithAI) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Cleaning up title with AI",
      });
      title = await cleanUpTitleWithAI(title);
    }

    await Clipboard.copy({ text: `[${title}](${url})`, html: `<a href="${url}">${title}</a>` });

    await showToast({
      style: Toast.Style.Success,
      title: "Copied title as link to clipboard",
    });
  } catch (error) {
    console.error(error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed copying title as link to clipboard",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}
