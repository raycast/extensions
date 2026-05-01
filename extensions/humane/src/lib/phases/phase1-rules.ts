import { bannedPhrases } from "../data/banned-phrases";
import { buzzwords } from "../data/buzzwords";
import { contractions } from "../data/contractions";
import type { IntensityLevel, Phase1Stats } from "../types";

export interface Phase1Result {
  text: string;
  stats: Phase1Stats;
}

// ── Pre-compiled matchers ────────────────────────────────────────────────────

interface CompiledMatcher {
  regex: RegExp;
  map: Record<string, string>;
}

function buildCompiledMatcher(
  map: Record<string, string>,
  options: { wordBoundary: boolean } = { wordBoundary: false },
): CompiledMatcher {
  const sorted = Object.keys(map).sort((a, b) => b.length - a.length);
  const pattern = sorted
    .map((k) => {
      const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return options.wordBoundary ? `\\b${escaped}\\b` : escaped;
    })
    .join("|");

  const normalised: Record<string, string> = {};
  for (const k of Object.keys(map)) {
    normalised[k.toLowerCase()] = map[k];
  }

  return { regex: new RegExp(pattern, "gi"), map: normalised };
}

const BANNED_MATCHER = buildCompiledMatcher(bannedPhrases);
const BUZZWORD_MATCHER = buildCompiledMatcher(buzzwords, { wordBoundary: true });
const CONTRACTION_MATCHER = buildCompiledMatcher(contractions, { wordBoundary: true });

// ── Helpers ──────────────────────────────────────────────────────────────────

function replaceEmDashes(text: string): string {
  return text.replace(/\s*—\s*/g, (match, offset: number) => {
    const after = text.slice(offset + match.length).trimStart();
    const startsNewClause = /^[A-Z]/.test(after);
    return startsNewClause ? ". " : ", ";
  });
}

function applyCompiledMatcher(text: string, matcher: CompiledMatcher): { text: string; count: number } {
  let count = 0;
  matcher.regex.lastIndex = 0;

  const result = text.replace(matcher.regex, (match, offset: number) => {
    const key = match.toLowerCase();
    const replacement = matcher.map[key];
    if (replacement === undefined) return match;
    count++;
    if (replacement === "") return "";

    const atSentenceStart = offset === 0 || /[.!?]\s*$/.test(text.slice(0, offset));

    if (atSentenceStart && replacement.length > 0) {
      return replacement[0].toUpperCase() + replacement.slice(1);
    }
    return replacement;
  });

  return { text: result, count };
}

function collapseNotJustButPattern(text: string): { text: string; count: number } {
  let count = 0;
  const regex = /not just\s+.+?\s+but\s+/gi;
  const result = text.replace(regex, () => {
    count++;
    return "";
  });
  return { text: result, count };
}

function cleanupArtifacts(text: string): string {
  return text
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/ {2,}/g, " ")
    .replace(/\n /g, "\n")
    .replace(/\.{2,}/g, ".")
    .replace(/,\s*,/g, ",")
    .trim();
}

export function runPhase1(text: string, intensity: IntensityLevel): Phase1Result {
  if (!text || typeof text !== "string") {
    return { text: text ?? "", stats: { phrasesReplaced: 0, buzzwordsReplaced: 0, contractionsApplied: 0 } };
  }

  let result = text;
  result = replaceEmDashes(result);

  const phrases = applyCompiledMatcher(result, BANNED_MATCHER);
  result = phrases.text;

  const notJust = collapseNotJustButPattern(result);
  result = notJust.text;

  const buzz = applyCompiledMatcher(result, BUZZWORD_MATCHER);
  result = buzz.text;

  let contractionsApplied = 0;
  if (intensity !== "clean") {
    const cont = applyCompiledMatcher(result, CONTRACTION_MATCHER);
    result = cont.text;
    contractionsApplied = cont.count;
  }

  result = cleanupArtifacts(result);

  return {
    text: result,
    stats: {
      phrasesReplaced: phrases.count + notJust.count,
      buzzwordsReplaced: buzz.count,
      contractionsApplied,
    },
  };
}
