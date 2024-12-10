import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { removeBackgroundFromImageFile, RemoveBgError } from "remove.bg";

export async function backgroundRemove(inputPath: string, outputFile: string): Promise<boolean> {
  const preferences = getPreferenceValues();
  await showToast({
    style: Toast.Style.Animated,
    title: "Removing Background",
  });

  try {
    await removeBackgroundFromImageFile({
      path: inputPath,
      apiKey: preferences.apiKey,
      size: "regular",
      type: "auto",
      scale: "100%",
      outputFile,
    });
    return true;
  } catch (errors) {
    await showToast({
      style: Toast.Style.Failure,
      title: "There was some issue removing background : " + (errors as RemoveBgError[]).map((e) => e.title).join(", "),
    });
    return false;
  }
}
