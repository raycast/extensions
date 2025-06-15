import { Clipboard, showHUD } from "@raycast/api";
import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  token: string;
}

interface EmailResponse {
  address?: string;
  error?: string;
}
async function getEmail() {
  const preferences = getPreferenceValues<Preferences>();
  console.log(preferences);
  const response = await fetch("https://quack.duckduckgo.com/api/email/addresses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${preferences.token}`,
    },
    redirect: "follow",
  });
  const parsedResponse = (await response.json()) as EmailResponse;
  if (parsedResponse.error) {
    throw new Error(parsedResponse.error);
  }
  return parsedResponse.address + "@duck.com";
}

export default async function main() {
  try {
    const email = await getEmail();
    await Clipboard.copy(email);
    await showHUD("Email copied to clipboard!");
  } catch (e: unknown) {
    let message = "Unknown error: " + JSON.stringify(e);
    if (e instanceof Error) {
      message = "Error from DuckDuckGo: " + e.message;
    }
    await showHUD(`⚠️ ${message}`);
  }
}
