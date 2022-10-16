import { showHUD, Clipboard, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { type } from "os";

interface Preferences {
  duckToken: string;
}

export default async function main() {
  const preferences = getPreferenceValues<Preferences>();
  const url = "https://quack.duckduckgo.com/api/email/addresses";
  const options = {
    method: "POST",
    headers: {
      Authorization: preferences.duckToken,
    },
  };
  await fetch(url, options)
    .then(async (res) => {
      const json: any = await res.json();
      if (typeof json.address !== "undefined") {
        await Clipboard.copy(json.address + "@duck.com");
        await showHUD("🎉 A new @duck.com email has been copied to clipboard.");
      } else {
        await showHUD("😱 Invalid Duckduckgo token!");
      }
    })
    .catch(async (err) => await showHUD("❌ Error: " + err));
}
