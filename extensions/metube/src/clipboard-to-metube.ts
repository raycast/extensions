import { showHUD, Clipboard } from "@raycast/api";
import { addToQueue } from "./helper.js";

export default async function main() {
  const clip = await Clipboard.readText();
  if (clip) {
    await showHUD("Sending clipboard to MeTube...");
    const response = await addToQueue(clip);

    if (response.status === "ok") {
      await showHUD("✅ Link added successfully.");
    } else {
      await showHUD(`❌ ${response.msg}`);
    }
  } else {
    await showHUD("Something went wrong.");
  }
}
