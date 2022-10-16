import { showHUD, Clipboard, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  rapidAPIKey: string;
}

export default async function main() {
  const preferences = getPreferenceValues<Preferences>();
  const url = "https://random-username-generate.p.rapidapi.com/?locale=en_US&minAge=18&maxAge=50";
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": preferences.rapidAPIKey,
      "X-RapidAPI-Host": "random-username-generate.p.rapidapi.com",
    },
  };
  await fetch(url, options)
    .then(async (res) => {
      const json: any = await res.json();
      await Clipboard.copy(json.items.name);
      await showHUD("🎉 A random name has been copied to clipboard.");
    })
    .catch(async (err) => await showHUD("❌ Error: " + err));
}
