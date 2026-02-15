export type AppendStyle = "raw" | "bullet" | "quote" | "timestamp";
export type InsertPosition = "end" | "beginning";

export interface FormatInput {
  style: AppendStyle;
  timestampFormat: string;
  now?: Date;
}

function normalizeNewlines(input: string): string {
  return input.replace(/\r\n?/g, "\n");
}

function trimTrailingNewlines(input: string): string {
  return input.replace(/\n+$/g, "");
}

function trimLeadingNewlines(input: string): string {
  return input.replace(/^\n+/g, "");
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function formatTimestamp(date: Date, format: string): string {
  const map: Record<string, string> = {
    YYYY: date.getFullYear().toString(),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
  };

  return Object.keys(map).reduce(
    (acc, token) => acc.replaceAll(token, map[token]),
    format,
  );
}

export function applyAppendStyle(
  inputText: string,
  format: FormatInput,
): string {
  const normalized = trimTrailingNewlines(normalizeNewlines(inputText));
  if (normalized.trim().length === 0) {
    throw new Error("Nothing to append. Text is empty.");
  }

  switch (format.style) {
    case "raw":
      return normalized;
    case "bullet": {
      const lines = normalized.split("\n");
      const [head, ...tail] = lines;
      const suffix = tail.map((line) => `\n  ${line}`).join("");
      return `- ${head}${suffix}`;
    }
    case "quote":
      return normalized
        .split("\n")
        .map((line) => (line.length > 0 ? `> ${line}` : ">"))
        .join("\n");
    case "timestamp": {
      const stamp = formatTimestamp(
        format.now ?? new Date(),
        format.timestampFormat || "YYYY-MM-DD HH:mm",
      );
      return `[${stamp}] ${normalized}`;
    }
    default:
      return normalized;
  }
}

export interface ComposeOptions {
  separator: string;
  ensureTrailingNewline: boolean;
  insertPosition?: InsertPosition;
}

export function composeAppendedContent(
  existingText: string,
  entry: string,
  options: ComposeOptions,
): string {
  const existingNormalized = normalizeNewlines(existingText);
  const entryNormalized = trimTrailingNewlines(normalizeNewlines(entry));

  if (entryNormalized.trim().length === 0) {
    throw new Error("Nothing to append. Text is empty.");
  }

  const separator =
    options.separator.length > 0 ? normalizeNewlines(options.separator) : "\n";

  if (existingNormalized.length === 0) {
    return options.ensureTrailingNewline
      ? `${entryNormalized}\n`
      : entryNormalized;
  }

  const existingTrimmedEnd = trimTrailingNewlines(existingNormalized);
  const insertPosition = options.insertPosition ?? "end";
  const merged =
    insertPosition === "beginning"
      ? `${entryNormalized}${separator}${trimLeadingNewlines(existingTrimmedEnd)}`
      : `${existingTrimmedEnd}${separator}${entryNormalized}`;

  return options.ensureTrailingNewline
    ? `${trimTrailingNewlines(merged)}\n`
    : merged;
}
