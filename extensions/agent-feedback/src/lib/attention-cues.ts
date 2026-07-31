import { TranscriptSegment } from "./types";

export type AttentionCueKind =
  | "cursor-reference"
  | "visual-direction"
  | "spatial-pointing"
  | "ui-reference"
  | "change-reference"
  | "visual-comparison"
  | "visual-emphasis";

export interface AttentionMoment {
  timestampMs: number;
  cue: string;
  kind: AttentionCueKind;
  text: string;
}

interface CueRule {
  kind: AttentionCueKind;
  score: number;
  pattern: RegExp;
}

const UI_REFERENTS =
  "part|section|area|button|link|title|heading|description|text|copy|label|card|panel|header|footer|menu|navigation|nav|icon|image|input|field|form|modal|dialog|popup|page|screen|element|component|layout|spacing|gap|color|border|corner|row|column|list|item|thing";

const CUE_RULES: CueRule[] = [
  {
    kind: "cursor-reference",
    score: 100,
    pattern:
      /\b(?:where|under|near|next to|beside|by)\s+(?:my|the)\s+(?:cursor|mouse|pointer)\b/gi,
  },
  {
    kind: "cursor-reference",
    score: 100,
    pattern:
      /\b(?:i(?:'m| am)\s+)?(?:pointing|hovering)\s+(?:at|over|on|here|there)\b/gi,
  },
  {
    kind: "visual-direction",
    score: 95,
    pattern:
      /\b(?:look|watch|notice|see|check|focus)\s+(?:right\s+)?(?:here|there|at\s+(?:this|that)|on\s+(?:this|that)|this|that)\b/gi,
  },
  {
    kind: "visual-direction",
    score: 95,
    pattern:
      /\b(?:take|have)\s+a\s+look\s+(?:right\s+)?(?:here|there|at\s+(?:this|that))\b/gi,
  },
  {
    kind: "visual-direction",
    score: 95,
    pattern:
      /\bpay\s+attention\s+(?:right\s+)?(?:here|there|to\s+(?:this|that))\b/gi,
  },
  {
    kind: "spatial-pointing",
    score: 85,
    pattern: /\b(?:right|over|up|down)\s+here\b/gi,
  },
  {
    kind: "spatial-pointing",
    score: 85,
    pattern: new RegExp(
      `\\b(?:the\\s+)?(?:${UI_REFERENTS})\\s+(?:right\\s+)?(?:here|there)\\b`,
      "gi",
    ),
  },
  {
    kind: "visual-direction",
    score: 85,
    pattern: /\b(?:click|tap)\s+(?:right\s+)?(?:here|there|this|that)\b/gi,
  },
  {
    kind: "ui-reference",
    score: 75,
    pattern: new RegExp(
      `\\b(?:this|that|these|those)\\s+(?:${UI_REFERENTS})\\b`,
      "gi",
    ),
  },
  {
    kind: "change-reference",
    score: 70,
    pattern:
      /\b(?:move|remove|delete|change|replace|resize|align|center|hide|show|fix|adjust|update|rename|make|put|add)\s+(?:this|that|these|those)\b/gi,
  },
  {
    kind: "visual-comparison",
    score: 65,
    pattern: /\b(?:like|unlike)\s+(?:this|that)\b/gi,
  },
  {
    kind: "visual-emphasis",
    score: 80,
    pattern:
      /\b(?:this|that)\s+is\s+(?:the\s+)?(?:important|key|problem|issue|part|bit)\b/gi,
  },
  {
    kind: "visual-emphasis",
    score: 80,
    pattern: /\b(?:especially|specifically)\s+(?:this|that|here|there)\b/gi,
  },
  {
    kind: "visual-emphasis",
    score: 80,
    pattern:
      /\b(?:(?:this|that)\s+is\s+what\s+i\s+mean|what\s+i\s+mean\s+is\s+(?:this|that))\b/gi,
  },
];

function timestampForMatch(
  segment: TranscriptSegment,
  matchIndex: number,
  matchLength: number,
): number {
  if (segment.toMs <= segment.fromMs || segment.text.length === 0)
    return segment.fromMs;
  const matchCenter = matchIndex + matchLength / 2;
  const progress = Math.max(0, Math.min(1, matchCenter / segment.text.length));
  return Math.round(
    segment.fromMs + progress * (segment.toMs - segment.fromMs),
  );
}

export function detectAttentionMoments(
  segments: TranscriptSegment[],
): AttentionMoment[] {
  const candidates: Array<AttentionMoment & { score: number }> = [];

  for (const segment of segments) {
    for (const rule of CUE_RULES) {
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.pattern.exec(segment.text))) {
        candidates.push({
          timestampMs: timestampForMatch(
            segment,
            match.index ?? 0,
            match[0].length,
          ),
          cue: match[0].trim(),
          kind: rule.kind,
          text: segment.text,
          score: rule.score,
        });
      }
    }
  }

  const selected: Array<AttentionMoment & { score: number }> = [];
  for (const candidate of candidates.sort(
    (left, right) =>
      right.score - left.score || left.timestampMs - right.timestampMs,
  )) {
    if (
      selected.some(
        (existing) =>
          Math.abs(existing.timestampMs - candidate.timestampMs) < 3_000,
      )
    )
      continue;
    selected.push(candidate);
  }

  return selected
    .sort((left, right) => left.timestampMs - right.timestampMs)
    .map((moment) => ({
      timestampMs: moment.timestampMs,
      cue: moment.cue,
      kind: moment.kind,
      text: moment.text,
    }));
}
