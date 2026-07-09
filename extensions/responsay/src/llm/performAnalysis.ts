import type { ProsodyAnalysis } from "../types";
import type { ProviderName, RawPrefs } from "./config";
import type { ChatConfig } from "./client";
import type { PromptOptions } from "./prompt";
import { isSingleWord } from "../lib/detect";
import { analysisCacheKey } from "../lib/cache-key";
import { resolveAnalysisConfig, resolveAnalysisModel } from "./config";

export interface AnalysisSinks {
  setLoading: (loading: boolean) => void;
  setFailed: (failed: boolean) => void;
  setAnalysis: (analysis: ProsodyAnalysis) => void;
}

export interface AnalysisIo {
  analyze: (
    text: string,
    opts: PromptOptions,
    cfg: ChatConfig,
  ) => Promise<ProsodyAnalysis>;
  readCache: (key: string) => ProsodyAnalysis | null;
  writeCache: (key: string, analysis: ProsodyAnalysis) => void;
  reportError: (err: unknown) => Promise<void>;
}

export interface PerformAnalysisCtx {
  prefs: RawPrefs;
  forceFresh?: boolean;
  /** Returns false once a newer request has superseded this one. */
  isCurrent: () => boolean;
  sinks: AnalysisSinks;
  io: AnalysisIo;
}

/**
 * Run one prosody-analysis request and push results into the provided sinks.
 *
 * State-mutating sinks are gated behind `isCurrent()` so that a stale request
 * (one the user has already superseded by switching provider/sentence) can
 * never overwrite the fresher request's result or loading/failed flags.
 * `reportError` is intentionally NOT gated — errors are never swallowed.
 */
export async function performAnalysis(
  input: string,
  provider: ProviderName,
  ctx: PerformAnalysisCtx,
): Promise<void> {
  const { prefs, forceFresh = false, isCurrent, sinks, io } = ctx;
  sinks.setLoading(true);
  sinks.setFailed(false);
  try {
    const isWord = isSingleWord(input);
    const model = resolveAnalysisModel(provider, prefs);
    const key = analysisCacheKey(input, provider, "GA", model);
    const cached = forceFresh ? null : io.readCache(key);
    if (cached) {
      if (isCurrent()) sinks.setAnalysis(cached);
      return;
    }
    const cfg = resolveAnalysisConfig(provider, prefs);
    const result = await io.analyze(input, { isWord, accent: "GA" }, cfg);
    io.writeCache(key, result);
    if (isCurrent()) sinks.setAnalysis(result);
  } catch (err) {
    if (isCurrent()) sinks.setFailed(true);
    await io.reportError(err);
  } finally {
    if (isCurrent()) sinks.setLoading(false);
  }
}
