import { showHUD, Clipboard, getPreferenceValues } from "@raycast/api";
import { validateArguments } from "./utiils";
import { PicsumArguments } from "./types";

const BASE_URL = "https://picsum.photos/";

export default async function PicsumCommand(props: { arguments: PicsumArguments }) {
  const width = props.arguments.width;
  const height = props.arguments.height;
  const { action: preference = "clipboard" } = getPreferenceValues();

  const image_url = `${BASE_URL}${width}${height !== "" ? "/" + height : ""}`;

  // Arguements error check
  if (!validateArguments(width, height)) {
    await showHUD("❌ Invalid image dimensions.");
    return;
  }

  // Copy or paste image url based on preference
  if (preference == "clipboard") {
    await Clipboard.copy(image_url);
    await showHUD("✅ Image url copied to clipboard.");
  } else {
    await Clipboard.paste(image_url);
    await showHUD("✅ Image url pasted to app.");
  }
}
