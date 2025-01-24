import { exec } from "child_process";
import { promisify } from "util";
import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { Preferences, SearchType } from "./types";

const execAsync = promisify(exec);

// Convert traditional Chinese to simplified using OpenCC if enabled
export async function convertToSimplified(text: string): Promise<string> {
  const { useSystemOpencc } = getPreferenceValues<Preferences>();

  if (!useSystemOpencc) {
    return text;
  }

  try {
    // Use the known working path directly
    const openccPath = "/opt/homebrew/bin/opencc";
    const command = `echo "${text}" | ${openccPath} -c t2s.json`;

    const { stdout } = await execAsync(command);
    return stdout.trim();
  } catch (error) {
    console.error("OpenCC error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "OpenCC Error",
      message: "Falling back to original text",
    });
    return text;
  }
}

// Construct the search URL based on search type
export function constructSearchUrl(query: string, type: SearchType): string {
  const baseUrl = "https://www.shenyandayi.com/";
  const encodedQuery = encodeURIComponent(query);
  const endpoint = type === "words" ? "wantWordsResult" : "wantQuotesResult";
  return `${baseUrl}${endpoint}?lang=zh&query=${encodedQuery}`;
}
