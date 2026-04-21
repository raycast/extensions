import {
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  getSelectedFinderItems,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";

export type Aggressiveness = "low" | "normal" | "high";
type TrimMode = "copy" | "paste";

type InputSource = "clipboard" | "selected-text" | "finder-item";

interface ResolvedInput {
  text: string;
  source: InputSource;
}

const BOX_CHARS = "[│┃╎╏┆┇┊┋╽╿￨｜]";
const BOX_DRAWING_CHARACTER_REGEX = new RegExp(BOX_CHARS);

const KNOWN_COMMAND_PREFIXES = [
  "sudo",
  "./",
  "~/",
  "apt",
  "brew",
  "git",
  "python",
  "pip",
  "pnpm",
  "npm",
  "yarn",
  "cargo",
  "bundle",
  "rails",
  "go",
  "make",
  "xcodebuild",
  "swift",
  "kubectl",
  "docker",
  "podman",
  "aws",
  "gcloud",
  "az",
  "ls",
  "cd",
  "cat",
  "echo",
  "env",
  "export",
  "open",
  "node",
  "java",
  "ruby",
  "perl",
  "bash",
  "zsh",
  "fish",
  "pwsh",
  "sh",
] as const;

const SCORE_THRESHOLDS: Record<Aggressiveness, number> = {
  low: 3,
  normal: 2,
  high: 1,
};

export function getPreferences<T extends Preferences.Trim | Preferences.TrimAndPaste | Preferences.PreviewTrim>(): T {
  return getPreferenceValues<T>();
}

export async function resolveInput(preferSelectionFallback: boolean): Promise<ResolvedInput> {
  if (preferSelectionFallback) {
    try {
      const selectedText = await getSelectedText();
      if (selectedText.trim()) {
        return { text: selectedText, source: "selected-text" };
      }
    } catch {
      // Fall through to Finder / clipboard.
    }

    if (process.platform === "darwin") {
      try {
        const selectedItems = await getSelectedFinderItems();
        const firstItem = selectedItems[0];
        if (firstItem?.path) {
          return { text: firstItem.path, source: "finder-item" };
        }
      } catch {
        // Fall through to clipboard.
      }
    }
  }

  // Retry once after a short delay — clipboard may not be ready immediately
  // after a copy when a no-view command fires right away.
  for (const delay of [0, 150]) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    const clipboardText = await Clipboard.readText();
    if (clipboardText?.trim()) {
      return { text: clipboardText, source: "clipboard" };
    }
  }

  throw new Error(
    preferSelectionFallback
      ? `No selected text${process.platform === "darwin" ? ", Finder item" : ""}, or clipboard text was available.`
      : "Clipboard is empty. Copy some text first, then run Trim.",
  );
}

export async function runTrimCommand(
  mode: TrimMode,
  preferences: Pick<
    Preferences.Trim | Preferences.TrimAndPaste | Preferences.PreviewTrim,
    "aggressiveness" | "preferSelectionFallback"
  >,
): Promise<void> {
  const { aggressiveness, preferSelectionFallback } = preferences;

  try {
    const input = await resolveInput(preferSelectionFallback);
    const cleaned = cleanText(input.text, aggressiveness);

    if (mode === "paste") {
      await closeMainWindow({ clearRootSearch: true });
      await Clipboard.paste(cleaned);
      await showHUD(
        cleaned === input.text
          ? `Pasted ${labelForSource(input.source)} unchanged`
          : `✂️ Trimmed and pasted ${labelForSource(input.source)}`,
      );
      return;
    }

    if (input.source === "clipboard" && cleaned === input.text) {
      await showHUD("Already clean — nothing changed");
      return;
    }

    await Clipboard.copy(cleaned);
    await showHUD(
      cleaned === input.text
        ? `Copied ${labelForSource(input.source)} to clipboard`
        : `✂️ Trimmed ${labelForSource(input.source)} to clipboard`,
    );
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: mode === "paste" ? "Trim and Paste failed" : "Trim failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function labelForSource(source: InputSource): string {
  switch (source) {
    case "clipboard":
      return "clipboard";
    case "selected-text":
      return "selected text";
    case "finder-item":
      return "Finder path";
  }
}

export function cleanText(text: string, aggressiveness: Aggressiveness): string {
  let currentText = normalizeLineEndings(text);

  const boxDrawingCleaned = stripBoxDrawingCharacters(currentText);
  if (boxDrawingCleaned !== null) currentText = boxDrawingCleaned;

  const promptStripped = stripPromptPrefixes(currentText);
  if (promptStripped !== null) currentText = promptStripped;

  const repairedURL = repairWrappedURL(currentText);
  if (repairedURL !== null) currentText = repairedURL;

  const quotedPath = quotePathWithSpaces(currentText);
  if (quotedPath !== null) currentText = quotedPath;

  const commandTransformed = transformIfCommand(currentText, aggressiveness);
  if (commandTransformed !== null) currentText = commandTransformed;

  return currentText !== text ? currentText : text;
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

function stripBoxDrawingCharacters(text: string): string | null {
  if (!BOX_DRAWING_CHARACTER_REGEX.test(text)) {
    return null;
  }

  let result = text.replace(/│ │/g, " ");
  const lines = result.split("\n");
  const nonEmptyLines = lines.filter((line) => line.trim());

  if (nonEmptyLines.length > 0) {
    const leadingPattern = new RegExp(`^\\s*${BOX_CHARS}+ ?`);
    const trailingPattern = new RegExp(` ?${BOX_CHARS}+\\s*$`);
    const majorityThreshold = majority(nonEmptyLines.length);

    const leadingMatches = nonEmptyLines.filter((line) => leadingPattern.test(line)).length;
    const trailingMatches = nonEmptyLines.filter((line) => trailingPattern.test(line)).length;
    const stripLeading = leadingMatches >= majorityThreshold;
    const stripTrailing = trailingMatches >= majorityThreshold;

    if (stripLeading || stripTrailing) {
      result = lines
        .map((line) => {
          let nextLine = line;
          if (stripLeading) {
            nextLine = nextLine.replace(leadingPattern, "");
          }
          if (stripTrailing) {
            nextLine = nextLine.replace(trailingPattern, "");
          }
          return nextLine;
        })
        .join("\n");
    }
  }

  result = result
    .replace(new RegExp(`\\|\\s*${BOX_CHARS}+\\s*`, "g"), "| ")
    .replace(new RegExp(`([:/])\\s*${BOX_CHARS}+\\s*([A-Za-z0-9])`, "g"), "$1$2")
    .replace(new RegExp(`(\\S)\\s*${BOX_CHARS}+\\s*(\\S)`, "g"), "$1 $2")
    .replace(new RegExp(`\\s*${BOX_CHARS}+\\s*`, "g"), " ")
    .replace(/ {2,}/g, " ")
    .trim();

  return result === text ? null : result;
}

function repairWrappedURL(text: string): string | null {
  const trimmed = text.trim();
  const lowercased = trimmed.toLowerCase();
  const schemeCount = (lowercased.match(/https?:\/\//g) ?? []).length;

  if (schemeCount !== 1) {
    return null;
  }

  if (!lowercased.startsWith("http://") && !lowercased.startsWith("https://")) {
    return null;
  }

  const collapsed = trimmed
    .split("\n")
    .map((line) => line.trim())
    .join("");
  if (collapsed === trimmed) {
    return null;
  }

  try {
    const parsed = new URL(collapsed);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? collapsed : null;
  } catch {
    return null;
  }
}

function quotePathWithSpaces(text: string): string | null {
  const trimmed = text.trim();

  if (!trimmed || trimmed.includes("\n")) {
    return null;
  }

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return null;
  }

  const [firstToken = ""] = trimmed.split(/\s+/, 1);
  if (!firstToken) {
    return null;
  }

  if (trimmed.includes("://")) {
    return null;
  }

  const hasExplicitPathPrefix =
    firstToken.startsWith("/") ||
    firstToken.startsWith("~/") ||
    firstToken.startsWith("./") ||
    firstToken.startsWith("../");
  const looksLikeRelativePath = firstToken.includes("/");

  if (!hasExplicitPathPrefix && !looksLikeRelativePath) {
    return null;
  }

  if (!trimmed.includes(" ")) {
    return null;
  }

  if (/\s-[A-Za-z]/.test(trimmed)) {
    return null;
  }

  return `"${trimmed.replaceAll('"', '\\"')}"`;
}

function transformIfCommand(text: string, aggressiveness: Aggressiveness): string | null {
  if (!text.includes("\n")) {
    return null;
  }

  const lines = text.split("\n");
  if (lines.length < 2) {
    return null;
  }

  if (aggressiveness === "low" && lines.length > 4) {
    return null;
  }

  if (lines.length > 10) {
    return null;
  }

  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  if (nonEmptyLines.length < 2) {
    return null;
  }

  const notHigh = aggressiveness !== "high";

  if (notHigh && isLikelyList(nonEmptyLines)) {
    return null;
  }

  const hasExplicitLineJoin =
    text.includes("\\\n") || /(\\|[|&]{1,2}|;)\s*$/m.test(text) || /^\s*[|&]{1,2}\s+\S/m.test(text);

  if (
    notHigh &&
    !hasExplicitLineJoin &&
    commandLineCount(nonEmptyLines) === nonEmptyLines.length &&
    nonEmptyLines.length >= 3
  ) {
    return null;
  }

  const strongCommandSignals =
    text.includes("\\\n") ||
    /[|&]{1,2}/.test(text) ||
    /(^|\n)\s*\$/.test(text) ||
    /[A-Za-z0-9._~-]+\/[A-Za-z0-9._~-]+/.test(text);

  const hasKnownCommandPrefix = containsKnownCommandPrefix(lines);

  if (notHigh && !strongCommandSignals && !hasKnownCommandPrefix && !hasCommandPunctuation(text)) {
    return null;
  }

  if (notHigh && isLikelySourceCode(text) && !strongCommandSignals) {
    return null;
  }

  let score = 0;
  if (text.includes("\\\n")) {
    score += 1;
  }
  if (/[|&]{1,2}/.test(text)) {
    score += 1;
  }
  if (/(^|\n)\s*\$/.test(text)) {
    score += 1;
  }
  if (isSingleCommandWithIndentedContinuations(nonEmptyLines)) {
    score += 1;
  }
  if (hasKnownCommandPrefix) {
    score += 1;
  }
  if (lines.every((line) => isLikelyCommandLine(line) || line.trim().length === 0)) {
    score += 1;
  }
  if (/^\s*(sudo\s+)?[A-Za-z0-9./~_-]+/m.test(text)) {
    score += 1;
  }
  if (/[A-Za-z0-9._~-]+\/[A-Za-z0-9._~-]+/.test(text)) {
    score += 1;
  }

  if (score < SCORE_THRESHOLDS[aggressiveness]) {
    return null;
  }

  const flattened = flatten(text);
  return flattened === text ? null : flattened;
}

function isLikelyCommandLine(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith("[[")) {
    return true;
  }

  if (trimmed.endsWith(".")) {
    return false;
  }

  return /^(sudo\s+)?[A-Za-z0-9./~_-]+(?:\s+|$)/.test(trimmed);
}

function containsKnownCommandPrefix(lines: string[]): boolean {
  return lines.some((line) => {
    const [firstToken = ""] = line.trim().toLowerCase().split(/\s+/, 1);
    return KNOWN_COMMAND_PREFIXES.some((prefix) => firstToken.startsWith(prefix));
  });
}

function hasCommandPunctuation(text: string): boolean {
  return (
    text.includes("@") ||
    /(?:^|\s)--[A-Za-z0-9][A-Za-z0-9_-]*/m.test(text) ||
    /(?:^|\s)-[A-Za-z](?:\s|$)/m.test(text) ||
    /\b[A-Za-z_][A-Za-z0-9_]*=/m.test(text) ||
    /(?:^|\s)(?:\.\/|~\/|\/)/m.test(text) ||
    /(?:^|\s)\.[A-Za-z0-9_-]+/m.test(text) ||
    text.includes("<") ||
    text.includes(">")
  );
}

function isLikelySourceCode(text: string): boolean {
  const hasBraces = text.includes("{") || text.includes("}") || text.toLowerCase().includes("begin");
  const hasKeywords =
    /^\s*(import|package|namespace|using|template|class|struct|enum|extension|protocol|interface|func|def|fn|let|var|public|private|internal|open|protected|if|for|while)\b/m.test(
      text,
    );

  return hasBraces && hasKeywords;
}

function isSingleCommandWithIndentedContinuations(lines: string[]): boolean {
  if (lines.length < 2 || !isLikelyCommandLine(lines[0])) {
    return false;
  }

  let sawIndentedLine = false;

  for (const line of lines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (/^\s/.test(line)) {
      sawIndentedLine = true;
      continue;
    }

    if (/^(\||&&|\|\||;|>|2>|<|--|-)/.test(trimmed)) {
      continue;
    }

    return false;
  }

  return sawIndentedLine;
}

function isLikelyList(lines: string[]): boolean {
  const listishCount = lines.filter((line) => {
    const trimmed = line.trim();
    const hasSpaces = /\s/.test(trimmed);

    return (
      /^[-*•]\s+\S/.test(trimmed) ||
      /^[0-9]+[.)]\s+\S/.test(trimmed) ||
      (!hasSpaces && /^[A-Za-z0-9]{4,}$/.test(trimmed) && !/[./$]/.test(trimmed))
    );
  }).length;

  return listishCount >= majority(lines.length);
}

function majority(count: number): number {
  return Math.floor(count / 2) + 1;
}

function commandLineCount(lines: string[]): number {
  return lines.filter((line) => isLikelyCommandLine(line)).length;
}

function flatten(text: string): string {
  return text
    .replace(/(?<=[A-Za-z0-9._~-])-\s*\n\s*([A-Za-z0-9._~-])/g, "-$1")
    .replace(/(?<!\n)([A-Z0-9_.-])\s*\n\s*([A-Z0-9_.-])(?!\n)/g, "$1$2")
    .replace(/(?<=[/~])\s*\n\s*([A-Za-z0-9._-])/g, "$1")
    .replace(/\\\s*\n/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripPromptPrefixes(text: string): string | null {
  const lines = text.split("\n");
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  if (nonEmptyLines.length === 0) {
    return null;
  }

  let strippedCount = 0;
  const rebuilt = lines.map((line) => {
    const stripped = stripPrompt(line);
    if (stripped !== null) {
      strippedCount += 1;
      return stripped;
    }
    return line;
  });

  const shouldStrip =
    nonEmptyLines.length === 1 ? strippedCount === 1 : strippedCount >= majority(nonEmptyLines.length);
  if (!shouldStrip) {
    return null;
  }

  const result = rebuilt.join("\n");
  return result === text ? null : result;
}

function stripPrompt(line: string): string | null {
  const match = line.match(/^(\s*)([#$])(.*)$/);
  if (!match) {
    return null;
  }

  const [, leadingWhitespace, , remainder] = match;
  const afterPrompt = remainder.trimStart();

  if (!isLikelyPromptCommand(afterPrompt)) {
    return null;
  }

  return `${leadingWhitespace}${afterPrompt}`;
}

function isLikelyPromptCommand(content: string): boolean {
  const trimmed = content.trim();

  if (!trimmed) {
    return false;
  }

  if (/[.?!]$/.test(trimmed)) {
    return false;
  }

  const hasCommandPunctuation = /[-./~$]/.test(trimmed) || /\d/.test(trimmed);
  const [firstToken = ""] = trimmed.toLowerCase().split(/\s+/, 1);
  const startsWithKnown = KNOWN_COMMAND_PREFIXES.some((prefix) => firstToken.startsWith(prefix));

  return (hasCommandPunctuation || startsWithKnown) && isLikelyCommandLine(trimmed);
}
