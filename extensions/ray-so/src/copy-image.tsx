import { getSelectedText, showToast, ToastStyle, showHUD, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import tempy from "tempy";
import fs from "fs";
import { encodeURI } from "js-base64";
import { runAppleScript } from "run-applescript";

interface Preferences {
  theme: string;
  padding: number;
  darkMode: boolean;
  background: boolean;
}

export default async () => {
  const preferences: Preferences = getPreferenceValues();

  let selectedText;
  try {
    selectedText = await getSelectedText();
  } catch (e) {
    await showHUD(
      "❌ Screenshot generation failed. Please make sure you've selected the text you want to take a screenshot of."
    );
    return;
  }

  const base64Text = encodeURI(selectedText);
  const tempFile = tempy.file({ extension: "png" });

  await showToast(ToastStyle.Animated, "Generating screenshot");

  const url = `https://ray.so/api/image?code=${base64Text}&theme=${preferences.theme}&darkMode=${preferences.darkMode}&background=${preferences.background}&spacing=${preferences.padding}`;

  const response = await fetch(url);

  if (response.status !== 200) {
    await showHUD(`❌ Screenshot generation failed. Server responded with ${response.status}`);
    return;
  }

  if (response.body !== null) {
    response.body.pipe(fs.createWriteStream(tempFile));

    await runAppleScript(`tell app "Finder" to set the clipboard to ( POSIX file "${tempFile}" )`);

    await showHUD("✅ Screenshot copied to clipboard!");
  }
};
