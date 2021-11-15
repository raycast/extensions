import { closeMainWindow, popToRoot } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { NullableString } from "../schema/types";

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
      tell window 1
      set newTab to make new tab ${url ? `with properties {URL:"${url}" }` : ""}
      end tell
    end tell
  `;
}

export async function openNewTabWithQuery(queryText: NullableString): Promise<void> {
  const url = "https://www.google.com/search?q=" + queryText;
  const script = generateScriptThatOpensUrlInEdge(url);
  return await runScriptAndCloseWindow(script);
}

export async function openNewTabWithUrl(url: NullableString): Promise<void> {
  const script = generateScriptThatOpensUrlInEdge(url);
  return await runScriptAndCloseWindow(script);
}

export async function runScriptAndCloseWindow(script: string): Promise<void> {
  await runAppleScript(script);
  await popToRoot({ clearSearchBar: true });
  return await closeMainWindow();
}
