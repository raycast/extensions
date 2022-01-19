import { closeMainWindow, popToRoot, showToast, ToastStyle } from "@raycast/api";
import { DEFAULT_ERROR_TITLE } from "./constants";
import { NullableString } from "../schema/types";
import { runAppleScript } from "run-applescript";

export async function openNewTab(queryText: NullableString, url: NullableString): Promise<void> {
  if (url) {
    return openNewTabWithUrl(url);
  } else if (queryText) {
    return openNewTabWithQuery(queryText);
  } else {
    return openNewTabWithUrl("");
  }
}

function generateScriptThatOpensUrlInEdge(url: NullableString): string {
  return `
    tell application "Microsoft Edge"
      activate
      ${url ? `open location "${url}"` : "tell front window to make new tab"}
    end tell
  `;
}

export async function openNewTabWithQuery(queryText: string): Promise<void> {
  try {
    const url = "https://www.google.com/search?q=" + encodeURI(queryText);
    const script = generateScriptThatOpensUrlInEdge(url);
    return await runScriptAndCloseWindow(script);
  } catch (error) {
    showToast(ToastStyle.Failure, DEFAULT_ERROR_TITLE, "Failed to search the query");
  }
}

export async function openNewTabWithUrl(url: string): Promise<void> {
  try {
    const script = generateScriptThatOpensUrlInEdge(url);
    return await runScriptAndCloseWindow(script);
  } catch (error) {
    showToast(ToastStyle.Failure, DEFAULT_ERROR_TITLE, "Failed to open the link");
  }
}

export async function runScriptAndCloseWindow(script: string): Promise<void> {
  await runAppleScript(script);
  await closeMainWindow({ clearRootSearch: true });
  return await popToRoot();
}
