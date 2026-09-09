import { validatePostLength } from "./v2/lib/post_text";
import { getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import { getErrorMessage } from "./utils";
import { clientV2 } from "./v2/lib/twitterapi_v2";

export default async function PostSelectedTextCommand() {
  try {
    const text = (await getSelectedText()).trim();
    if (!text) throw new Error("Select some text before running this command.");
    validatePostLength(text);

    await showHUD("Posting selected text...");
    await clientV2.sendTweet(text);
    await showHUD("Posted selected text to X");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not post selected text",
      message: getErrorMessage(error),
    });
  }
}
