import { Clipboard, showHUD } from "@raycast/api";
import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  token: string;
}

interface EmailResponse {
  address: string;
}
async function getEmail() {
  const preferences = getPreferenceValues<Preferences>();
  console.log(preferences);
  let response = await fetch(
    "https://quack.duckduckgo.com/api/email/addresses",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${preferences.token}`,
      },
      redirect: "follow",
    },
  );
  const parsedResponse = (await response.json()) as EmailResponse;
  return parsedResponse.address + "@duck.com";
}

export default async function main() {
  await Clipboard.copy(await getEmail());
  await showHUD("Email copied to clipboard!");
}
