import { parseKoreanDate } from "@kky/ko-date-parse";
import { showHUD, Clipboard, getSelectedText } from "@raycast/api";
import { format } from "date-fns";

export default async function main() {
  const koreanDateExpression = await getSelectedText();

  const result = parseKoreanDate(koreanDateExpression);
  if (result === undefined) {
    await showHUD("Failed to parse Korean date");
    return;
  }

  const formattedDate = format(result, "MM/dd");
  await Clipboard.copy(format(result, "MM/dd"));
  await showHUD(formattedDate);

  return;
}
