import { SYSTEM_VOICE_FALLBACK_MESSAGE } from "./ttsErrorRouter";

/**
 * Pure orchestrator for the "try Gemini TTS, fall back to say(1)" flow. Returns
 * a verdict so the component owns the UI. See AGENTS.md → Error Handling for the
 * fallback-before-decide invariant.
 */
export type PronounceOutcome =
  | { kind: "primary"; cached: boolean }
  | { kind: "aborted" }
  | { kind: "fallback-ok"; message: string }
  | { kind: "failed"; title: string; message: string };

export type PronounceFlowDeps = {
  signal: AbortSignal;
  attemptPrimary: () => Promise<{ cached: boolean }>;
  attemptFallback: (() => Promise<void>) | null;
  routeError: (err: unknown) => { title: string; message: string; fallback: boolean };
};

export async function runPronounceWithFallback(deps: PronounceFlowDeps): Promise<PronounceOutcome> {
  try {
    const result = await deps.attemptPrimary();
    return { kind: "primary", cached: result.cached };
  } catch (err) {
    if (deps.signal.aborted) return { kind: "aborted" };

    const routed = deps.routeError(err);
    if (routed.fallback && deps.attemptFallback) {
      try {
        await deps.attemptFallback();
        return { kind: "fallback-ok", message: SYSTEM_VOICE_FALLBACK_MESSAGE };
      } catch {
        // Fallback also failed — fall through to surface the original Gemini failure.
      }
    }
    return { kind: "failed", title: routed.title, message: routed.message };
  }
}
