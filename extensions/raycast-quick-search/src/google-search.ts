import { showHUD } from "@raycast/api";
import { GoogleSearchOpner } from "./utils/opener";
import { isNotEmpty, readtext } from "./utils/readtxt";

export default async () => {
  try {
    const text = await readtext();
    if (isNotEmpty(text)) {
      await GoogleSearchOpner(text);
      showHUD("🎉 Open google search");
    } else {
      showHUD("👀 Can not found target text");
    }
  } catch (error) {
    showHUD("💩 Sorry, Can not open google search for now!");
  }
};
