import { Aggressiveness, SCORE_THRESHOLD, TrimConfig, TrimResult } from "./types";

const BOX_DRAWING_CLASS = "[│┃╎╏┆┇┊┋╽╿￨｜]";
const BOX_DRAWING_RE = new RegExp(BOX_DRAWING_CLASS);
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
];

function splitKeepingEmpty(text: string): string[] {
  return text.split(/\r?\n/);
}

function splitOmittingEmpty(text: string): string[] {
  return text.split(/\r?\n/).filter((line) => line.length > 0);
}

function firstToken(text: string): string | undefined {
  const match = text.trim().split(/\s+/, 1)[0];
  return match || undefined;
}

export class TextCleaner {
  cleanBoxDrawingCharacters(text: string, enabled: boolean): string | null {
    if (!enabled) return null;
    return TextCleaner.stripBoxDrawingCharacters(text);
  }

  stripURLQueryParams(text: string, keeping: Set<string> = new Set()): string | null {
    return this.stripURLQueryParamsResolving(text, () => keeping);
  }

  stripURLQueryParamsResolving(text: string, resolveKeeping: (host: string) => Set<string>): string | null {
    const trimmed = text.trim();
    if (trimmed.includes("\n")) return null;
    const lowered = trimmed.toLowerCase();
    if (!lowered.startsWith("http://") && !lowered.startsWith("https://")) return null;

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return null;
    }

    const queryIndex = trimmed.indexOf("?");
    if (queryIndex === -1) return null;
    const hashIndex = trimmed.indexOf("#", queryIndex);
    const query = hashIndex === -1 ? trimmed.slice(queryIndex + 1) : trimmed.slice(queryIndex + 1, hashIndex);
    if (!query) return null;

    const original = parsePercentEncodedQuery(query);
    if (original.length === 0) return null;

    const keeping = resolveKeeping(parsed.hostname ?? "");
    let filtered = original;
    if (keeping.size === 0) {
      filtered = [];
    } else {
      filtered = original.filter((item) => keeping.has(decodeURIComponent(item.name)));
      if (filtered.length === original.length) return null;
    }

    const base = trimmed.slice(0, queryIndex);
    const hash = hashIndex === -1 ? "" : trimmed.slice(hashIndex);
    const stripped = filtered.length === 0 ? `${base}${hash}` : `${base}?${serializeQuery(filtered)}${hash}`;
    return stripped === trimmed ? null : stripped;
  }

  repairWrappedURL(text: string): string | null {
    const trimmed = text.trim();
    const lowercased = trimmed.toLowerCase();
    const schemeCount = lowercased.split("https://").length - 1 + (lowercased.split("http://").length - 1);
    if (schemeCount !== 1) return null;
    if (!lowercased.startsWith("http://") && !lowercased.startsWith("https://")) return null;

    const collapsed = trimmed.replace(/\s+/g, "");
    if (collapsed === trimmed) return null;

    const validURLPattern = /^https?:\/\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+$/;
    if (!validURLPattern.test(collapsed)) return null;
    return collapsed;
  }

  quotePathWithSpaces(text: string): string | null {
    const trimmed = text.trim();
    if (!trimmed || trimmed.includes("\n")) return null;
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return null;
    }

    const token = firstToken(trimmed);
    if (!token) return null;
    if (trimmed.includes("://")) return null;

    const hasExplicitPathPrefix =
      token.startsWith("/") || token.startsWith("~/") || token.startsWith("./") || token.startsWith("../");
    const looksLikeRelativePath = token.includes("/");
    if (!hasExplicitPathPrefix && !looksLikeRelativePath) return null;
    if (!trimmed.includes(" ")) return null;
    if (/^\/[A-Za-z0-9_-]+(:[A-Za-z0-9_-]+)?\s/.test(trimmed)) return null;
    if (/\s--?[A-Za-z]/.test(trimmed)) return null;

    const escaped = trimmed.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }

  dedentParagraphIndent(text: string): string | null {
    if (!/\n/.test(text)) return null;

    const lines = splitKeepingEmpty(text);
    const nonEmptyIndices = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.trim().length > 0)
      .map(({ index }) => index);
    if (nonEmptyIndices.length < 2) return null;

    const nonEmptyLines = nonEmptyIndices.map((index) => lines[index]);
    if (this.isLikelyList(nonEmptyLines)) return null;
    if (this.isLikelySourceCode(text)) return null;
    if (this.isLikelyStructuredData(nonEmptyLines)) return null;
    if (this.hasCommandPunctuation(text)) return null;

    const indentedProseLines = nonEmptyIndices.flatMap((index) => {
      const line = lines[index];
      const indent = leadingWhitespaceCount(line);
      if (indent <= 0) return [];
      const trimmed = line.trim();
      if (!this.isLikelyProseLine(trimmed)) return [];
      return [indent];
    });

    const requiredIndentedLines = Math.max(2, Math.floor(nonEmptyIndices.length / 2) + 1);
    if (indentedProseLines.length < requiredIndentedLines) return null;
    const commonIndent = Math.min(...indentedProseLines);
    if (commonIndent <= 0) return null;

    const dedented = lines
      .map((line) => {
        const indent = leadingWhitespaceCount(line);
        if (indent < commonIndent) return line;
        return line.slice(commonIndent);
      })
      .join("\n");

    return dedented === text ? null : dedented;
  }

  transform(text: string, config: TrimConfig, aggressivenessOverride?: Aggressiveness): TrimResult {
    let currentText = text;
    let wasTransformed = false;

    const cleaned = this.cleanBoxDrawingCharacters(currentText, config.removeBoxDrawing);
    if (cleaned !== null) {
      currentText = cleaned;
      wasTransformed = true;
    }

    const claude = this.stripClaudeCodeDecoration(currentText, config.flattenClaudeCodePrompts);
    if (claude !== null) {
      currentText = claude;
      wasTransformed = true;
    }

    const promptStripped = this.stripPromptPrefixes(currentText);
    if (promptStripped !== null) {
      currentText = promptStripped;
      wasTransformed = true;
    }

    const repairedURL = this.repairWrappedURL(currentText);
    if (repairedURL !== null) {
      currentText = repairedURL;
      wasTransformed = true;
    }

    const quotedPath = this.quotePathWithSpaces(currentText);
    if (quotedPath !== null) {
      currentText = quotedPath;
      wasTransformed = true;
    }

    const commandTransformed = this.transformIfCommand(currentText, config, aggressivenessOverride);
    if (commandTransformed !== null) {
      currentText = commandTransformed;
      wasTransformed = true;
    }

    const dedentedParagraph = this.dedentParagraphIndent(currentText);
    if (dedentedParagraph !== null) {
      currentText = dedentedParagraph;
      wasTransformed = true;
    }

    return { original: text, trimmed: currentText, wasTransformed };
  }

  transformIfCommand(text: string, config: TrimConfig, aggressivenessOverride?: Aggressiveness): string | null {
    if (!text.includes("\n")) return null;

    const lines = splitOmittingEmpty(text);
    if (lines.length < 2) return null;
    if (aggressivenessOverride !== "high" && lines.length > 4) return null;
    if (aggressivenessOverride !== "high" && this.isLikelyList(lines)) return null;
    if (lines.length > 10) return null;

    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

    const hasLineContinuation = text.includes("\\\n");
    const hasLineJoinerAtEOL = /(?:\\|[&|]{1,2}|;)\s*$/m.test(text);
    const hasIndentedPipeline = /^\s*[&|]{1,2}\s+\S/m.test(text);
    const hasExplicitLineJoin = hasLineContinuation || hasLineJoinerAtEOL || hasIndentedPipeline;

    if (
      aggressivenessOverride !== "high" &&
      config.aggressiveness !== "high" &&
      !hasExplicitLineJoin &&
      this.commandLineCount(nonEmptyLines) === nonEmptyLines.length &&
      nonEmptyLines.length >= 3
    ) {
      return null;
    }

    const aggressiveness = aggressivenessOverride ?? config.aggressiveness;

    const strongCommandSignals =
      text.includes("\\\n") ||
      /[&|]{1,2}/.test(text) ||
      /(^|\n)\s*\$/.test(text) ||
      /[A-Za-z0-9._~-]+\/[A-Za-z0-9._~-]+/.test(text);

    const hasKnownCommandPrefix = this.containsKnownCommandPrefix(lines);
    if (
      aggressiveness !== "high" &&
      aggressivenessOverride !== "high" &&
      !strongCommandSignals &&
      !hasKnownCommandPrefix &&
      !this.hasCommandPunctuation(text)
    ) {
      return null;
    }

    if (
      aggressiveness !== "high" &&
      aggressivenessOverride !== "high" &&
      this.isLikelySourceCode(text) &&
      !strongCommandSignals
    ) {
      return null;
    }

    let score = 0;
    if (text.includes("\\\n")) score += 1;
    if (/[&|]{1,2}/.test(text)) score += 1;
    if (/(^|\n)\s*\$/.test(text)) score += 1;
    if (this.isSingleCommandWithIndentedContinuations(nonEmptyLines)) score += 1;
    if (lines.every((line) => this.isLikelyCommandLine(line))) score += 1;
    if (/^\s*(sudo\s+)?[A-Za-z0-9./~_-]+/m.test(text)) score += 1;
    if (/[A-Za-z0-9._~-]+\/[A-Za-z0-9._~-]+/.test(text)) score += 1;

    if (score < SCORE_THRESHOLD[aggressiveness]) return null;

    const flattened = this.flatten(text, config.preserveBlankLines);
    return flattened === text ? null : flattened;
  }

  stripClaudeCodeDecoration(text: string, enabled: boolean): string | null {
    if (!enabled) return null;

    const lines = splitKeepingEmpty(text);
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    if (nonEmptyLines.length === 0) return null;

    const firstNonEmpty = nonEmptyLines[0].trim();
    const promptPrefix = "\u276F";

    if (firstNonEmpty.startsWith(promptPrefix)) {
      const ruleIndex = lines.findIndex((line) => {
        const trimmed = line.trim();
        const dashes = [...trimmed].filter((char) => char === "\u2500" || char === "\u2501").length;
        return dashes >= 10;
      });

      if (ruleIndex !== -1) {
        const content = lines.slice(ruleIndex + 1);
        const nonEmptyContent = content.filter((line) => line.trim().length > 0);
        if (nonEmptyContent.length === 0) return null;
        const result = flattenWrappedLines(nonEmptyContent);
        return result === text ? null : result;
      }

      const stripped = firstNonEmpty.replace(new RegExp(`^[${promptPrefix}\\s]+`), "");
      if (nonEmptyLines.length === 1) {
        return stripped === text ? null : stripped;
      }
      const allLines = nonEmptyLines.slice();
      allLines[0] = stripped;
      const result = flattenWrappedLines(allLines);
      return result === text ? null : result;
    }

    if (/^\/[A-Za-z0-9_-]+(:[A-Za-z0-9_-]+)?($|[\s"])/.test(firstNonEmpty) && nonEmptyLines.length >= 2) {
      const result = flattenWrappedLines(nonEmptyLines);
      return result === text ? null : result;
    }

    const trimmedText = text.trim();
    if (trimmedText.startsWith('"/') && trimmedText.endsWith('"') && trimmedText.includes('\\"')) {
      const unquoted = trimmedText.slice(1, -1);
      const unescaped = unquoted.replace(/\\"/g, '"');
      return unescaped === text ? null : unescaped;
    }

    return null;
  }

  stripPromptPrefixes(text: string): string | null {
    const lines = splitKeepingEmpty(text);
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    if (nonEmptyLines.length === 0) return null;

    let strippedCount = 0;
    const rebuilt = lines.map((line) => {
      const stripped = this.stripPrompt(line);
      if (stripped !== null) {
        strippedCount += 1;
        return stripped;
      }
      return line;
    });

    const majorityThreshold = Math.floor(nonEmptyLines.length / 2) + 1;
    const shouldStrip = nonEmptyLines.length === 1 ? strippedCount === 1 : strippedCount >= majorityThreshold;
    if (!shouldStrip) return null;

    const result = rebuilt.join("\n");
    return result === text ? null : result;
  }

  static stripBoxDrawingCharacters(text: string): string | null {
    if (!BOX_DRAWING_RE.test(text)) return null;

    let result = text;
    if (result.includes("│ │")) {
      result = result.replaceAll("│ │", " ");
    }

    const lines = splitKeepingEmpty(result);
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    if (nonEmptyLines.length > 0) {
      const leadingPattern = new RegExp(`^\\s*${BOX_DRAWING_CLASS}+ ?`);
      const trailingPattern = new RegExp(` ?${BOX_DRAWING_CLASS}+\\s*$`);
      const majorityThreshold = Math.floor(nonEmptyLines.length / 2) + 1;

      const leadingMatches = nonEmptyLines.filter((line) => leadingPattern.test(line)).length;
      const trailingMatches = nonEmptyLines.filter((line) => trailingPattern.test(line)).length;
      const stripLeading = leadingMatches >= majorityThreshold;
      const stripTrailing = trailingMatches >= majorityThreshold;

      if (stripLeading || stripTrailing) {
        result = lines
          .map((line) => {
            let lineStr = line;
            if (stripLeading) lineStr = lineStr.replace(leadingPattern, "");
            if (stripTrailing) lineStr = lineStr.replace(trailingPattern, "");
            return lineStr;
          })
          .join("\n");
      }
    }

    const boxAfterPipePattern = new RegExp(`\\|\\s*${BOX_DRAWING_CLASS}+\\s*`, "g");
    result = result.replace(boxAfterPipePattern, "| ");

    const boxPathJoinPattern = new RegExp(`([:/])\\s*${BOX_DRAWING_CLASS}+\\s*([A-Za-z0-9])`, "g");
    result = result.replace(boxPathJoinPattern, "$1$2");

    const boxMidTokenPattern = new RegExp(`(\\S)\\s*${BOX_DRAWING_CLASS}+\\s*(\\S)`, "g");
    result = result.replace(boxMidTokenPattern, "$1 $2");

    result = result.replace(new RegExp(`\\s*${BOX_DRAWING_CLASS}+\\s*`, "g"), " ");
    const collapsed = result.replace(/ {2,}/g, " ");
    const trimmed = collapsed.trim();
    return trimmed === text ? null : trimmed;
  }

  private isLikelyCommandLine(lineSubstr: string): boolean {
    const line = lineSubstr.trim();
    if (!line) return false;
    if (line.startsWith("[[")) return true;
    if (line.endsWith(".")) return false;
    return /^(sudo\s+)?[A-Za-z0-9./~_-]+(?:\s+|$)/.test(line);
  }

  private stripPrompt(line: string): string | null {
    const leadingWhitespace = line.match(/^\s*/)?.[0] ?? "";
    const remainder = line.slice(leadingWhitespace.length);
    const first = remainder[0];
    if (first !== "#" && first !== "$") return null;

    const afterPrompt = remainder.slice(1).replace(/^\s+/, "");
    if (!this.isLikelyPromptCommand(afterPrompt)) return null;
    return leadingWhitespace + afterPrompt;
  }

  private isLikelyPromptCommand(content: string): boolean {
    const trimmed = content.trim();
    if (!trimmed) return false;
    const last = trimmed[trimmed.length - 1];
    if (last === "." || last === "?" || last === "!") return false;

    const hasCommandPunctuation = /[-./~$]/.test(trimmed) || /\d/.test(trimmed);
    const token = firstToken(trimmed)?.toLowerCase() ?? "";
    const startsWithKnown = KNOWN_COMMAND_PREFIXES.some((prefix) => token.startsWith(prefix));
    if (!hasCommandPunctuation && !startsWithKnown) return false;
    return this.isLikelyCommandLine(trimmed);
  }

  private isLikelySourceCode(text: string): boolean {
    const hasBraces = text.includes("{") || text.includes("}") || text.toLowerCase().includes("begin");
    const keywordPattern =
      /^\s*(import|package|namespace|using|template|class|struct|enum|extension|protocol|interface|func|def|fn|let|var|public|private|internal|open|protected|if|for|while)\b/m;
    return hasBraces && keywordPattern.test(text);
  }

  private isSingleCommandWithIndentedContinuations(lines: string[]): boolean {
    if (lines.length < 2) return false;
    if (!this.isLikelyCommandLine(lines[0])) return false;

    let sawIndentedLine = false;
    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^\s/.test(line)) {
        sawIndentedLine = true;
        continue;
      }
      if (
        trimmed.startsWith("|") ||
        trimmed.startsWith("&&") ||
        trimmed.startsWith("||") ||
        trimmed.startsWith(";") ||
        trimmed.startsWith(">") ||
        trimmed.startsWith("2>") ||
        trimmed.startsWith("<") ||
        trimmed.startsWith("--") ||
        trimmed.startsWith("-")
      ) {
        continue;
      }
      return false;
    }
    return sawIndentedLine;
  }

  private containsKnownCommandPrefix(lines: string[]): boolean {
    return lines.some((line) => {
      const token = firstToken(line);
      if (!token) return false;
      const lower = token.toLowerCase();
      return KNOWN_COMMAND_PREFIXES.some((prefix) => lower.startsWith(prefix));
    });
  }

  private hasCommandPunctuation(text: string): boolean {
    if (text.includes("@")) return true;
    if (/(?:^|\s)--[A-Za-z0-9][A-Za-z0-9_-]*/m.test(text)) return true;
    if (/(?:^|\s)-[A-Za-z](?:\s|$)/m.test(text)) return true;
    if (/\b[A-Za-z_][A-Za-z0-9_]*=/m.test(text)) return true;
    if (/(?:^|\s)(?:\.\/|~\/|\/)/m.test(text)) return true;
    if (/(?:^|\s)\.[A-Za-z0-9_-]+/m.test(text)) return true;
    if (text.includes("<") || text.includes(">")) return true;
    return false;
  }

  private isLikelyProseLine(line: string): boolean {
    const first = line[0];
    if (!first || !(/[A-Za-z]/.test(first) || `"'(`.includes(first))) return false;
    if (/^[-*•]|^[0-9]+[.)]\s|^(?:\$|#|>|[&|;{}])/.test(line)) return false;
    if (/^["'][^"']+["']\s*:/.test(line)) return false;
    if (/^(?:sudo|git|npm|pnpm|yarn|swift|xcodebuild|docker|kubectl|cd|ls|cat|echo|make)\b/i.test(line)) return false;
    return /\s/.test(line) || /[,.!?;:]/.test(line);
  }

  private isLikelyStructuredData(lines: string[]): boolean {
    return lines.some((line) => {
      const trimmed = line.trim();
      if (trimmed === "{" || trimmed === "}" || trimmed === "[" || trimmed === "]") return true;
      return /^["'][^"']+["']\s*:/.test(trimmed);
    });
  }

  private isLikelyList(lines: string[]): boolean {
    const nonEmpty = lines.filter((line) => line.trim().length > 0);
    if (nonEmpty.length < 2) return false;

    const listishCount = nonEmpty.filter((line) => {
      const trimmed = line.trim();
      const hasSpaces = /\s/.test(trimmed);
      if (/^[-*•]\s+\S/.test(trimmed)) return true;
      if (/^[0-9]+[.)]\s+\S/.test(trimmed)) return true;
      if (!hasSpaces && /^[A-Za-z0-9]{4,}$/.test(trimmed) && !/[./$]/.test(trimmed)) return true;
      return false;
    }).length;

    return listishCount >= Math.floor(nonEmpty.length / 2) + 1;
  }

  private commandLineCount(lines: string[]): number {
    return lines.filter((line) => this.isLikelyCommandLine(line)).length;
  }

  private flatten(text: string, preserveBlankLines: boolean): string {
    const placeholder = "__BLANK_SEP__";
    let result = text;
    if (preserveBlankLines) {
      result = result.replace(/\n\s*\n/g, placeholder);
    }
    result = result.replace(/(?<=[A-Za-z0-9._~-])-\s*\n\s*([A-Za-z0-9._~-])/g, "-$1");
    result = result.replace(/(?<!\n)([A-Z0-9_.-])\s*\n\s*(?!-)([A-Z0-9_.-])(?!\n)/g, "$1$2");
    result = result.replace(/(?<=[/~])\s*\n\s*([A-Za-z0-9._-])/g, "$1");
    result = result.replace(/\\\s*\n/g, " ");
    result = result.replace(/\n+/g, " ");
    result = result.replace(/\s+/g, " ");
    if (preserveBlankLines) {
      result = result.replaceAll(placeholder, "\n\n");
    }
    return result.trim();
  }
}

function leadingWhitespaceCount(line: string): number {
  const match = line.match(/^\s*/);
  return match ? match[0].length : 0;
}

function flattenWrappedLines(lines: string[]): string {
  return lines
    .map((line) => line.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

interface QueryItem {
  name: string;
  value: string | null;
}

function parsePercentEncodedQuery(query: string): QueryItem[] {
  if (!query) return [];
  return query.split("&").map((part) => {
    const eq = part.indexOf("=");
    if (eq === -1) return { name: part, value: null };
    return { name: part.slice(0, eq), value: part.slice(eq + 1) };
  });
}

function serializeQuery(items: QueryItem[]): string {
  return items.map((item) => (item.value === null ? item.name : `${item.name}=${item.value}`)).join("&");
}
