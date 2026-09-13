import { getSelectedText, showHUD } from "@raycast/api";

import { openGoogleAiMode } from "./google-ai-mode";

export default async function Command() {
  let query: string;

  try {
    query = (await getSelectedText()).trim();
  } catch {
    await showHUD("Select some text first");
    return;
  }

  if (!query) {
    await showHUD("Select some text first");
    return;
  }

  await openGoogleAiMode(query);
}
