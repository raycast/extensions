import { Clipboard, getPreferenceValues, popToRoot, showHUD } from "@raycast/api";
import { CaseType, modifyCasesWrapper } from "./cases.js";
import { NoTextError, readContent } from "./utils.js";

export async function applyCase(caseType: CaseType): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();

  let content: string;
  try {
    content = await readContent(preferences.source);
  } catch (error) {
    if (error instanceof NoTextError) {
      await showHUD("❌ No text available — select text or copy to clipboard first");
    }
    return;
  }

  const modified = modifyCasesWrapper(content, caseType).rawText;

  if (preferences.action === "paste") {
    await Clipboard.paste(modified);
  } else {
    await Clipboard.copy(modified);
  }

  if (!preferences.hideHUD) {
    await showHUD(`Converted to ${caseType}`);
  }

  if (preferences.popToRoot) {
    await popToRoot();
  }
}
