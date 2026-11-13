/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { LanguageCode } from "@/core/language/types";
import type { LanguageDetectType } from "@/core/results/kinds";

interface LanguageCandidate {
  readonly language: LanguageCode | undefined;
  readonly confidence: number;
}

/** A detector reports observations; only the detection policy decides whether to confirm them. */
export type DetectionObservation =
  | Readonly<{ kind: "single"; type: LanguageDetectType; language: LanguageCode | undefined; confidence?: number }>
  | Readonly<{ kind: "ranked"; type: LanguageDetectType; candidates: readonly LanguageCandidate[] }>;

export type DetectionDecision =
  | { type: LanguageDetectType; language: LanguageCode; confirmed: boolean }
  | { type: LanguageDetectType; language: "auto"; confirmed: false };
