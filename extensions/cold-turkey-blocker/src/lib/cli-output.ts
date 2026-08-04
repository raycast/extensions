export type BlockState = "enabled" | "disabled" | "unknown";
export type BlockKind = "website-app" | "device" | "unknown";
export type StopPasswordError = "password-required" | "invalid-password";

export interface ParsedBlock {
  name: string;
  kind: BlockKind;
}

const ESC = String.fromCharCode(27);
const CSI = String.fromCharCode(155);
const ANSI_ESCAPE_PATTERN = new RegExp(`(?:${ESC}\\[|${CSI})[0-?]*[ -/]*[@-~]`, "g");

export function decodeCliOutput(value: string | Buffer): string {
  if (typeof value === "string") return cleanCliOutput(value);
  if (value.length === 0) return "";

  let decoded: string;
  if (value.length >= 2 && value[0] === 0xff && value[1] === 0xfe) {
    decoded = value.subarray(2).toString("utf16le");
  } else if (value.length >= 2 && value[0] === 0xfe && value[1] === 0xff) {
    const payloadLength = Math.floor((value.length - 2) / 2) * 2;
    const swapped = Buffer.allocUnsafe(payloadLength);
    for (let index = 0; index < payloadLength; index += 2) {
      swapped[index] = value[index + 3];
      swapped[index + 1] = value[index + 2];
    }
    decoded = swapped.toString("utf16le");
  } else if (looksLikeUtf16Le(value)) {
    decoded = value.toString("utf16le");
  } else {
    decoded = value.toString("utf8");
  }

  return cleanCliOutput(decoded);
}

export function cleanCliOutput(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .replace(ANSI_ESCAPE_PATTERN, "")
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

export function looksLikeHelpOutput(value: string): boolean {
  const output = cleanCliOutput(value).toLowerCase();
  return (
    output.includes('-start "block name"') &&
    (output.includes("-list-blocks") || output.includes("starts the specified block"))
  );
}

export function looksLikeCliError(value: string): boolean {
  return cleanCliOutput(value)
    .split("\n")
    .map(stripDiagnosticPrefix)
    .some((line) => /^error\s*:/i.test(line.trim()));
}

export function extractCliError(value: string): string | undefined {
  const line = cleanCliOutput(value)
    .split("\n")
    .map(stripDiagnosticPrefix)
    .find((entry) => /^error\s*:/i.test(entry.trim()));
  return line?.trim();
}

export function classifyStopPasswordError(value: string): StopPasswordError | undefined {
  const output = cleanCliOutput(value);

  if (
    /\binvalid\s+number\s+of\s+parameters\s+to\s+unlock\s+(?:a\s+)?password\s+lock\b/i.test(output) ||
    /\b(?:password\s+(?:is\s+)?(?:required|missing)|(?:requires?|needs)\s+(?:a\s+)?password|(?:missing|no)\s+password)\b/i.test(
      output,
    )
  ) {
    return "password-required";
  }

  if (
    /\b(?:invalid|wrong|incorrect)\s+password\b/i.test(output) ||
    /\bpassword\s+(?:is\s+|was\s+)?(?:invalid|wrong|incorrect)\b/i.test(output)
  ) {
    return "invalid-password";
  }

  return undefined;
}

export function parseBlockList(value: string): ParsedBlock[] {
  const output = cleanCliOutput(value);
  if (!output) return [];

  const jsonBlocks = parseJsonBlockList(output);
  if (jsonBlocks) return uniqueBlocks(jsonBlocks);

  const lines = output.split("\n").map((line) => stripDiagnosticPrefix(line).trim());
  const hasKnownSectionHeading = lines.some((line) => parseSectionHeading(line) !== undefined);
  const blocks: ParsedBlock[] = [];
  let currentKind: BlockKind = "unknown";

  for (const [index, rawLine] of lines.entries()) {
    let line = rawLine;
    if (!line) continue;

    const headingKind = parseSectionHeading(line);
    if (headingKind) {
      currentKind = headingKind;
      continue;
    }

    if (isUnknownSectionHeading(lines, index, hasKnownSectionHeading)) {
      currentKind = "unknown";
      continue;
    }

    if (shouldSkipBlockListLine(line)) continue;

    line = line.replace(/^(?:[•*>]|[-–—]\s+|\d+[.)]\s+)/, "").trim();

    const statusSuffix = line.match(/^(.*?)\s*(?:[:–—-]|\bis\b)\s*(enabled|disabled)\.?$/i);
    if (statusSuffix?.[1]) line = statusSuffix[1].trim();

    const normalized = normalizeBlockName(line);
    if (normalized) blocks.push({ name: normalized, kind: currentKind });
  }

  return uniqueBlocks(blocks);
}

export function parseBlockNames(value: string): string[] {
  return parseBlockList(value).map((block) => block.name);
}

export function parseBlockState(value: string): BlockState {
  const output = cleanCliOutput(value).toLowerCase();
  if (!output) return "unknown";

  const lines = output
    .split("\n")
    .map((line) =>
      stripDiagnosticPrefix(line)
        .trim()
        .replace(/[.!]+$/, ""),
    )
    .filter(Boolean)
    .reverse();

  for (const line of lines) {
    if (/^(?:disabled|inactive|off|stopped|false)$/.test(line)) return "disabled";
    if (/^(?:enabled|active|on|started|true)$/.test(line)) return "enabled";

    const explicit = line.match(/^(?:status|state)\s*[:=-]\s*(enabled|disabled)$/);
    if (explicit?.[1] === "enabled") return "enabled";
    if (explicit?.[1] === "disabled") return "disabled";

    const named = line.match(/^.+\s+is\s+(enabled|disabled)$/);
    if (named?.[1] === "enabled") return "enabled";
    if (named?.[1] === "disabled") return "disabled";
  }

  return "unknown";
}

export function compactCliOutput(value: string, maxLength = 240): string | undefined {
  const output = cleanCliOutput(value).replace(/\s+/g, " ");
  if (!output) return undefined;
  if (output.length <= maxLength) return output;
  return `${output.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function blockKindLabel(kind: BlockKind): string {
  switch (kind) {
    case "website-app":
      return "Website & App";
    case "device":
      return "Device";
    case "unknown":
      return "Unknown Type";
  }
}

export function blockKindMatchesExpected(actual: BlockKind, expected: BlockKind): boolean {
  return actual === "unknown" || expected === "unknown" || actual === expected;
}

function parseJsonBlockList(output: string): ParsedBlock[] | undefined {
  try {
    const parsed = JSON.parse(output) as unknown;
    if (!Array.isArray(parsed)) return undefined;

    const blocks: ParsedBlock[] = [];
    for (const entry of parsed) {
      if (typeof entry === "string") {
        const name = normalizeBlockName(entry);
        if (name) blocks.push({ name, kind: "unknown" });
        continue;
      }

      if (entry && typeof entry === "object" && "name" in entry && typeof entry.name === "string") {
        const name = normalizeBlockName(entry.name);
        const rawKind = "kind" in entry && typeof entry.kind === "string" ? entry.kind.toLowerCase() : "";
        const kind: BlockKind = rawKind.includes("device")
          ? "device"
          : rawKind.includes("web") || rawKind.includes("app")
            ? "website-app"
            : "unknown";
        if (name) blocks.push({ name, kind });
      }
    }
    return blocks;
  } catch {
    return undefined;
  }
}

function parseSectionHeading(value: string): BlockKind | undefined {
  const heading = value.replace(/[:\s]+$/, "").trim();
  if (/^website\s*(?:&|and)\s*app\s+blocks?$/i.test(heading) || /^website\s+blocks?$/i.test(heading)) {
    return "website-app";
  }
  if (/^device\s+blocks?$/i.test(heading)) return "device";
  return undefined;
}

function isUnknownSectionHeading(lines: string[], index: number, hasKnownSectionHeading: boolean): boolean {
  if (!hasKnownSectionHeading) return false;

  const heading = lines[index].replace(/[:\s]+$/, "").trim();
  if (!/^.+\s+blocks$/i.test(heading)) return false;

  const isFirstContentLine = lines.slice(0, index).every((line) => !line);
  const followsSectionBreak = index > 0 && !lines[index - 1];
  const startsPopulatedSection = index + 1 < lines.length && Boolean(lines[index + 1]);
  return (isFirstContentLine || followsSectionBreak) && startsPopulatedSection;
}

function shouldSkipBlockListLine(line: string): boolean {
  return (
    /^(?:cold turkey blocker|blocks?|block names?|available blocks?|list of blocks)\s*:?$/i.test(line) ||
    /^no blocks(?: found)?\.?$/i.test(line) ||
    /^usage\s*:/i.test(line) ||
    /^where \[options\]/i.test(line) ||
    /^-{1,2}(?:start|stop|toggle|status|list-blocks|add|add-block|add-device-block|help|lock)\b/i.test(line) ||
    /^error\s*:/i.test(line)
  );
}

function normalizeBlockName(value: string): string {
  let name = value.trim();

  const matchingQuote =
    (name.startsWith('"') && name.endsWith('"')) ||
    (name.startsWith("'") && name.endsWith("'")) ||
    (name.startsWith("“") && name.endsWith("”"));
  if (matchingQuote && name.length >= 2) name = name.slice(1, -1).trim();

  return name;
}

function uniqueBlocks(values: ParsedBlock[]): ParsedBlock[] {
  const byName = new Map<string, ParsedBlock>();
  for (const block of values) {
    const key = block.name.toLocaleLowerCase();
    const previous = byName.get(key);
    if (!previous || (previous.kind === "unknown" && block.kind !== "unknown")) byName.set(key, block);
  }
  return [...byName.values()];
}

function stripDiagnosticPrefix(value: string): string {
  return value.replace(/^\s*=>\s?/, "");
}

function looksLikeUtf16Le(value: Buffer): boolean {
  if (value.length < 4) return false;
  let oddZeros = 0;
  let oddBytes = 0;
  for (let index = 1; index < Math.min(value.length, 256); index += 2) {
    oddBytes += 1;
    if (value[index] === 0) oddZeros += 1;
  }
  return oddBytes > 0 && oddZeros / oddBytes >= 0.3;
}
