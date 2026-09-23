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
  const response = await fetch("https://quack.duckduckgo.com/api/email/addresses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${preferences.token}`,
      // DuckDuckGo's bot protection rejects requests without a browser-like User-Agent
      "User-Agent": "Mozilla/5.0",
    },
    redirect: "follow",
  });
  const body = await response.text();
  let parsedResponse: EmailResponse;
  try {
    parsedResponse = JSON.parse(body) as EmailResponse;
  } catch {
    // Non-JSON body (e.g. empty 403 from bot protection)
    parsedResponse = {};
  }
  if (!response.ok || parsedResponse.error) {
    throw new Error(parsedResponse.error ?? `Request failed with status ${response.status}`);
  }
  if (!parsedResponse.address) {
    throw new Error("No address in response");
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
