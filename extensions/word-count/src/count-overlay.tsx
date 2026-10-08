import { showToast, Toast } from "@raycast/api";
import { count } from "./lib/count";
import { readFromSelection, readFromClipboard } from "./utils";

export default async function Command() {
  let content = await readFromSelection(false);
  if (!content) {
    content = await readFromClipboard(false);
  }
  const wordCount = count(content, true).words;
  await showToast({ style: Toast.Style.Success, title: `Word Count: ${wordCount}` });
}
