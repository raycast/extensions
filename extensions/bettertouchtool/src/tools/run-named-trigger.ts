import { getPreferenceValues, Tool } from "@raycast/api";
import { runNamedTriggerAppleScript, runNamedTriggerUrl } from "../api";
import { Result } from "../types";
import { SearchResult } from "./search-named-triggers";

type Input = {
  /**
   * The search result to run, found by running the search-named-triggers tool.
   */
  searchResult: SearchResult;

  /**
   * Optional override for the run type. By default, the value is determined by
   * user preferences. URL may also be referred to as "HTTP" or "URL Scheme".
   * AppleScript may also be referred to as "JXA" or "JavaScript" or "Script".
   */
  runType?: "URL" | "AppleScript";
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Are you sure you want to run the Named Trigger "${input.searchResult.name}"${input.runType ? ` with run type "${input.runType}"` : ""}?`,
  };
};

/**
 * Run a named trigger in BetterTouchTool
 * IMPORTANT: You MUST use the search-named-triggers tool first.
 *
 * Example requests:
 * - "Run the named trigger 'My Trigger'"
 * - "Run turn off the screen"
 * - "Run x via url"
 * - "Invoke y via applescript"
 */
export default async function tool(input: Input): Promise<Result<void>> {
  if (!input.runType) {
    const { bttNamedTriggerDefaultAction } = getPreferenceValues<Preferences>();
    input.runType = bttNamedTriggerDefaultAction === "applescript" ? "AppleScript" : "URL";
  }

  if (!input.searchResult || !input.searchResult.name) {
    return { status: "error", error: "No named trigger provided." };
  }

  if (!input.searchResult.enabled) {
    return { status: "error", error: `The Named Trigger "${input.searchResult.name}" is disabled.` };
  }

  if (input.runType === "AppleScript") {
    return await runNamedTriggerAppleScript(input.searchResult.name);
  } else {
    try {
      await runNamedTriggerUrl(input.searchResult.name);
      return { status: "success" };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { status: "error", error: errorMessage };
    }
  }
}
