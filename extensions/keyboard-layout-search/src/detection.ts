import type { Application } from "@raycast/api";
import { convertToEnglish, getLayout, LAYOUTS, type LayoutDefinition, type LayoutId, type LayoutMode } from "./layout";
import { rankApplications, type RankedApplication } from "./search";

export type CorrectionCandidate = {
  query: string;
  layout?: LayoutDefinition;
  changedCharacters: number;
  applications: RankedApplication[];
  score: number;
};

export type DetectedCorrection = CorrectionCandidate & {
  alternatives: CorrectionCandidate[];
};

function createCandidate(
  rawQuery: string,
  applications: Application[],
  layout?: LayoutDefinition,
): CorrectionCandidate {
  const conversion = layout ? convertToEnglish(rawQuery, layout) : { text: rawQuery, changedCharacters: 0 };
  const rankedApplications = rankApplications(applications, conversion.text);
  const bestApplicationScore = rankedApplications[0]?.score ?? 0;
  const hasScriptSignal = layout?.scriptPattern?.test(rawQuery) ?? false;
  const scriptBonus = hasScriptSignal ? 1500 + conversion.changedCharacters * 5 : 0;

  return {
    query: conversion.text,
    layout,
    changedCharacters: conversion.changedCharacters,
    applications: rankedApplications,
    score: bestApplicationScore * 10 + scriptBonus,
  };
}

function deduplicateCandidates(candidates: CorrectionCandidate[]): CorrectionCandidate[] {
  const bestByQuery = new Map<string, CorrectionCandidate>();

  for (const candidate of candidates) {
    const existing = bestByQuery.get(candidate.query);
    if (!existing || candidate.score > existing.score) bestByQuery.set(candidate.query, candidate);
  }

  return Array.from(bestByQuery.values());
}

export function detectCorrection(rawQuery: string, applications: Application[], mode: LayoutMode): DetectedCorrection {
  if (mode !== "auto") {
    const candidate = createCandidate(rawQuery, applications, getLayout(mode));
    return { ...candidate, alternatives: [] };
  }

  const original = createCandidate(rawQuery, applications);
  const candidates = deduplicateCandidates([
    original,
    ...LAYOUTS.map((layout) => createCandidate(rawQuery, applications, layout)),
  ]);
  const sorted = candidates.sort(
    (left, right) => right.score - left.score || right.changedCharacters - left.changedCharacters,
  );
  const best = sorted[0] ?? original;

  // Latin layouts are inherently ambiguous. Only prefer an AZERTY/QWERTZ
  // conversion when it produces a materially better application match.
  const shouldKeepOriginal = !best.layout?.scriptPattern && best.score < original.score + 1500;
  const selected = shouldKeepOriginal ? original : best;

  return {
    ...selected,
    alternatives: sorted
      .filter((candidate) => candidate.query !== selected.query && candidate.changedCharacters > 0)
      .slice(0, 4),
  };
}

export function isLayoutMode(value: string): value is LayoutMode {
  return value === "auto" || LAYOUTS.some((layout) => layout.id === (value as LayoutId));
}
