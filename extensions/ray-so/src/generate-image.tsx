import { getSelectedText, open, showToast, showHUD, getPreferenceValues, Toast } from "@raycast/api";
import { createRaySoUrl } from "./utils";

export default async () => {
  const preferences = getPreferenceValues<Preferences>();

  let selectedText;
  try {
    selectedText = await getSelectedText();
  } catch {
    await showHUD(
      "❌ Screenshot generation failed. Please make sure you've selected the text you want to take a screenshot of.",
    );
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Generating screenshot",
  });

  const url = createRaySoUrl({ ...preferences, code: selectedText });
  await open(url);
};
