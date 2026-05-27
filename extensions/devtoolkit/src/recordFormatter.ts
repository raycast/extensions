export type RecordDelimiter =
  | "comma"
  | "space"
  | "semicolon"
  | "new-line"
  | "vertical-bar";
export type QuoteStyle = "none" | "double" | "single";

export type FormatRecordsOptions = {
  input: string;
  splitBy: RecordDelimiter;
  joinWith: RecordDelimiter;
  quoteStyle: QuoteStyle;
  trimRecords: boolean;
  removeDuplicates: boolean;
};

const delimiterValues: Record<RecordDelimiter, string> = {
  comma: ",",
  space: " ",
  semicolon: ";",
  "new-line": "\n",
  "vertical-bar": "|",
};

export function formatRecords(options: FormatRecordsOptions): string {
  const splitPattern = delimiterPattern(options.splitBy);
  const records = options.input
    .split(splitPattern)
    .map((record) => (options.trimRecords ? record.trim() : record))
    .filter((record) => record.length > 0);

  const uniqueRecords = options.removeDuplicates
    ? removeDuplicates(records)
    : records;
  const quotedRecords = uniqueRecords.map((record) =>
    quoteRecord(record, options.quoteStyle),
  );

  return quotedRecords.join(delimiterValues[options.joinWith]);
}

function delimiterPattern(delimiter: RecordDelimiter): string | RegExp {
  if (delimiter === "space") {
    return /\s+/;
  }

  if (delimiter === "new-line") {
    return /\r?\n/;
  }

  return delimiterValues[delimiter];
}

function removeDuplicates(records: string[]): string[] {
  const seen = new Set<string>();
  const uniqueRecords: string[] = [];

  for (const record of records) {
    if (seen.has(record)) {
      continue;
    }

    seen.add(record);
    uniqueRecords.push(record);
  }

  return uniqueRecords;
}

function quoteRecord(record: string, quoteStyle: QuoteStyle): string {
  if (quoteStyle === "double") {
    return `"${record}"`;
  }

  if (quoteStyle === "single") {
    return `'${record}'`;
  }

  return record;
}
