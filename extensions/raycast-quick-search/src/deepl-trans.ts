import { showHUD } from "@raycast/api";
import { DeeplOpner } from "./utils/opener";
import { isNotEmpty, readtext } from "./utils/readtxt";

export default async () => {
  try {
    const text = await readtext();
    if (isNotEmpty(text)) {
      await DeeplOpner(text);
      showHUD("🎉 Open deepl search");
    } else {
      showHUD("👀 Can not found target text");
    }
  } catch (error) {
    showHUD("💩 Sorry, Can not open deepl for now!");
  }
};
