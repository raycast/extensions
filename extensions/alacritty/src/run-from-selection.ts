import { getSelectedText } from "@raycast/api";
import { runText } from "./lib/run-text";
import { wrapWithErrorToast } from "./utils/wrap-with-error-toast";

export default wrapWithErrorToast(async () => {
  const text = await getSelectedText();
  if (!text.length) {
    throw new Error("Selection is empty");
  }

  await runText("selection", text);
});
