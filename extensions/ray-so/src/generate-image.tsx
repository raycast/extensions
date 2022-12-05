import { getSelectedText, showToast, ToastStyle, showHUD, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import tempy from "tempy";
import fs from "fs";
import { encodeURI } from "js-base64";
import { runAppleScript } from "run-applescript";
import open from "open";

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

  const url = `https://ray.so/?theme=${preferences.theme}&background=${preferences.background}&darkMode=${preferences.darkMode}&spacing=${preferences.padding}&code=${base64Text}`;
  open(url);
};
