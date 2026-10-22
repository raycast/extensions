/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getPreferenceValues } from "@raycast/api";

import { config } from "@/core/config";
import type { LanguageCode, SourceLanguage } from "@/core/language/types";
import { LanguageDetectType } from "@/core/results/kinds";
import type { BaseDetectProvider } from "@/providers/detect/base";
import { detectServices } from "@/providers/detect/registry";
import { CancelledError } from "@/shared/errors";
import { logError, logSummary, logTrace } from "@/shared/logger";

import type { DetectionDecision, DetectionObservation } from "./types";
import { isChinese, isEnglishOrNumber } from "./utils";

interface DetectSnapshot {
  remote: readonly BaseDetectProvider[];
  local: readonly BaseDetectProvider[];
  preferred: readonly SourceLanguage[];
  speedFirst: boolean;
}

type SingleObservation = Extract<DetectionObservation, { kind: "single" }>;

function createSnapshot(): DetectSnapshot {
  const preferences = getPreferenceValues<Preferences>();
  const enabled = detectServices
    .filter((service) => !service.preference || preferences[service.preference] !== false)
    .map((service) => new service.provider())
    .filter((provider) => provider.isEnabled());
  return {
    remote: enabled.filter((provider) => !provider.isLocal),
    local: enabled.filter((provider) => provider.isLocal),
    preferred: config.preferredLanguages.map((item) => item.youdaoLangCode),
    speedFirst: config.enableDetectLanguageSpeedFirst,
  };
}

export async function detectLanguage(text: string, signal?: AbortSignal): Promise<DetectionDecision> {
  if (signal?.aborted) throw new CancelledError();
  const snapshot = createSnapshot();
  const started = performance.now();
  // Tencent's detector is case-sensitive; retain the current remote normalization.
  const decision =
    (await detectRemote(text.toLowerCase(), snapshot, signal)) ?? (await detectLocal(text, snapshot, signal));
  const source =
    decision.type === LanguageDetectType.Simple || decision.type === LanguageDetectType.Franc
      ? `local:${decision.type}`
      : decision.type;
  logSummary(
    "Detect",
    `${decision.language} (${source}, ${(performance.now() - started).toFixed(0)}ms, ${decision.confirmed ? "confirmed" : "unconfirmed"})`,
  );
  return decision;
}

function decisionFor(observation: SingleObservation, confirmed = false): DetectionDecision {
  return observation.language === undefined
    ? { type: observation.type, language: "auto", confirmed: false }
    : { type: observation.type, language: observation.language, confirmed };
}

/** Retain the detector-specific confidence used when no early consensus wins. */
function fallbackDecision(observation: SingleObservation): DetectionDecision {
  return decisionFor(
    observation,
    observation.type === LanguageDetectType.Baidu ||
      (observation.type === LanguageDetectType.Volcano && (observation.confidence ?? 0) > 0.5),
  );
}

function chooseRemoteFallback(observations: SingleObservation[]): DetectionDecision | undefined {
  if (observations.length === 1) return fallbackDecision(observations[0]);
  // Previously every mapped observation acquired `prior`; preserve the first such observation without mutating it.
  const firstMapped = observations.find((observation) => observation.language !== undefined);
  if (firstMapped) return fallbackDecision(firstMapped);
  const bing = observations.find((observation) => observation.type === LanguageDetectType.Bing);
  return bing ? decisionFor(bing) : undefined;
}

function detectRemote(
  text: string,
  snapshot: DetectSnapshot,
  callerSignal?: AbortSignal,
): Promise<DetectionDecision | undefined> {
  if (!snapshot.remote.length) return Promise.resolve(undefined);
  const controller = new AbortController();
  const signal = callerSignal ? AbortSignal.any([callerSignal, controller.signal]) : controller.signal;
  const observations: SingleObservation[] = [];

  return new Promise((resolve, reject) => {
    let settled = false;
    let remaining = snapshot.remote.length;
    const finish = (decision: DetectionDecision | undefined) => {
      if (settled) return;
      settled = true;
      callerSignal?.removeEventListener("abort", abort);
      if (decision?.confirmed) controller.abort();
      resolve(decision);
    };
    const abort = () => {
      if (settled) return;
      settled = true;
      callerSignal?.removeEventListener("abort", abort);
      controller.abort();
      reject(new CancelledError());
    };
    if (callerSignal?.aborted) {
      abort();
      return;
    }
    callerSignal?.addEventListener("abort", abort, { once: true });

    for (const provider of snapshot.remote) {
      provider
        .detect(text, { signal })
        .then((observation) => {
          if (settled || observation.kind !== "single") return;
          observations.push(observation);
          if (observation.language === undefined) return;
          const matching = observations.filter((candidate) => candidate.language === observation.language).length;
          if (
            snapshot.remote.length === 1 ||
            (snapshot.speedFirst && snapshot.preferred.includes(observation.language)) ||
            matching >= 2
          ) {
            finish(decisionFor(observation, true));
          }
        })
        .catch((error) => {
          if (error instanceof CancelledError) {
            if (!callerSignal?.aborted) logTrace("Detect", "detect cancelled");
          } else {
            logError("Detect", "race detect error", error);
          }
        })
        .finally(() => {
          remaining -= 1;
          if (remaining === 0 && !settled) finish(chooseRemoteFallback(observations));
        });
    }
  });
}

async function detectLocal(text: string, snapshot: DetectSnapshot, signal?: AbortSignal): Promise<DetectionDecision> {
  if (signal?.aborted) throw new CancelledError();
  const provider = snapshot.local[0];
  if (provider) {
    try {
      const observation = await provider.detect(text, { signal });
      if (signal?.aborted) throw new CancelledError();
      if (observation.kind === "ranked") {
        const confident = observation.candidates.find(
          (candidate) =>
            candidate.language !== undefined &&
            candidate.confidence > 0.8 &&
            snapshot.preferred.includes(candidate.language),
        );
        if (confident?.language) return { type: observation.type, language: confident.language, confirmed: true };
        const preferred = observation.candidates.find(
          (candidate) =>
            candidate.language !== undefined &&
            candidate.confidence > 0.2 &&
            snapshot.preferred.includes(candidate.language),
        );
        const language = preferred?.language ?? observation.candidates[0]?.language;
        if (language) return { type: observation.type, language, confirmed: false };
      } else if (observation.language) {
        return decisionFor(observation);
      }
    } catch (error) {
      if (signal?.aborted || error instanceof CancelledError) throw new CancelledError();
      logError("Detect", "local detect error", error);
    }
  }

  let language: LanguageCode | undefined;
  if (isEnglishOrNumber(text) && snapshot.preferred.includes("en")) language = "en";
  else if (isChinese(text) && snapshot.preferred.some((code) => code.startsWith("zh"))) language = "zh-CHS";
  return language === undefined || !snapshot.preferred.includes(language)
    ? { type: LanguageDetectType.Simple, language: "auto", confirmed: false }
    : { type: LanguageDetectType.Simple, language, confirmed: false };
}
