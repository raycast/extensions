import { isCsv, isTsv } from "../util/detector";
import { InvalidFormatError } from "../error";
import { convertToMarkdownTable } from "../util/converter";

export async function convertCsvToMarkdown(text: string): Promise<string> {
  if (!isCsv(text) && !isTsv(text)) {
    throw new InvalidFormatError("Clipboard data is not in CSV or TSV format");
  }

  const delimiter = isCsv(text) ? "," : "\t";
  return convertToMarkdownTable(text, delimiter);
}
