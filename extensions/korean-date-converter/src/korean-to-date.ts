import { parseKoreanDate } from "@kky/ko-date-parse";
import { showHUD, Clipboard, getSelectedText, getPreferenceValues } from "@raycast/api";
import { format } from "date-fns";

interface Preferences {
  defaultAction: "copy" | "paste";
}

export default async function main() {
  const preference = getPreferenceValues<Preferences>();
  const defaultAction = preference.defaultAction || "copy";

  const koreanDateExpression = await getSelectedText();

  const result = parseKoreanDate(koreanDateExpression);
  if (result === undefined) {
    await showHUD("Failed to parse Korean date");
    return;
  }

  const formattedDate = format(result, "MM/dd");

  if (defaultAction === "paste") {
    await Clipboard.paste(formattedDate);
  } else {
    await Clipboard.copy(formattedDate);
  }

  await showHUD(formattedDate);

  return;
}
