export interface CsvRow {
  line: number;
  values: string[];
}

export class CsvParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
  ) {
    super(`${message} (line ${line})`);
    this.name = "CsvParseError";
  }
}

const SPREADSHEET_FORMULA_PREFIX = /^[=+\-@]/;

export function protectSpreadsheetText(value: string): string {
  return value.startsWith("'") || SPREADSHEET_FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

export function restoreSpreadsheetText(value: string): string {
  if (value.startsWith("''") || /^'[=+\-@]/.test(value)) {
    return value.slice(1);
  }
  return value;
}

export function parseCsv(input: string): CsvRow[] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: CsvRow[] = [];
  let row: string[] = [];
  let field = "";
  let line = 1;
  let rowLine = 1;
  let inQuotes = false;
  let closedQuote = false;

  const pushField = () => {
    row.push(field);
    field = "";
    closedQuote = false;
  };

  const pushRow = () => {
    pushField();
    if (row.some((value) => value.trim() !== "")) {
      rows.push({ line: rowLine, values: row });
    }
    row = [];
    rowLine = line;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          closedQuote = true;
        }
      } else {
        field += character;
        if (character === "\n") {
          line += 1;
        }
      }
      continue;
    }

    if (closedQuote) {
      if (character === ",") {
        pushField();
        continue;
      }
      if (character === "\n" || character === "\r") {
        if (character === "\r" && text[index + 1] === "\n") {
          index += 1;
        }
        line += 1;
        pushRow();
        rowLine = line;
        continue;
      }
      if (character === " " || character === "\t") {
        continue;
      }
      throw new CsvParseError("Unexpected character after a closing quote", line);
    }

    if (character === '"' && field.trim() === "") {
      field = "";
      inQuotes = true;
    } else if (character === ",") {
      pushField();
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      line += 1;
      pushRow();
      rowLine = line;
    } else {
      field += character;
    }
  }

  if (inQuotes) {
    throw new CsvParseError("Unclosed quoted field", line);
  }
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows;
}
