import { Clipboard } from "@raycast/api";
import { runText } from "./lib/run-text";
import { wrapWithErrorToast } from "./utils/wrap-with-error-toast";

export default wrapWithErrorToast(async () => {
  const { text } = await Clipboard.read();
  if (!text.length) {
    throw new Error("Clipboard is empty");
  }

  await runText("clipboard", text);
});
