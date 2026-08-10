import { showHUD, Clipboard } from "@raycast/api";
import { addToQueue, isValidLink } from "./helper.js";
import { showFailureToast } from "@raycast/utils";

export default async function main() {
  const clip = await Clipboard.readText();
  if (clip && isValidLink(clip)) {
    await showHUD("Sending clipboard to MeTube...");
    const response = await addToQueue(clip);

    if (response.status === "ok") {
      await showHUD("✅ Link added successfully.");
    } else {
      await showHUD(`❌ ${response.msg}`);
    }
  } else if (clip && !isValidLink(clip)) {
    showFailureToast("Clipboard does not contain a valid link", { title: "Invalid link" });
    // await showHUD("❌ No valid link in your clipboard");
  } else {
    await showHUD("Something went wrong.");
  }
}
