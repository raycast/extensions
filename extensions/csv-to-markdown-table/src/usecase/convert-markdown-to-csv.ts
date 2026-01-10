import { isMarkdownTable } from "../util/detector";
import { InvalidFormatError } from "../error";
import { convertFromMarkdownTable } from "../util/converter";

export async function convertMarkdownToCsv(text: string): Promise<string> {
  if (!isMarkdownTable(text)) {
    throw new InvalidFormatError(
      "Clipboard data is not in Markdown table format",
    );
  }

  return convertFromMarkdownTable(text, ",");
}
