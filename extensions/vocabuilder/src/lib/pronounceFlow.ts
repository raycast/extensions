/**
 * Pure orchestrator for the "try provider TTS, fall back to say(1)" flow. Returns
 * a verdict so the component owns the UI. See AGENTS.md → Error Handling for the
 * fallback-before-decide invariant.
 */
export type PronounceOutcome =
  | { kind: "primary"; cached: boolean }
  | { kind: "system" }
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
        return { kind: "fallback-ok", message: routed.message };
      } catch {
        // Fallback also failed — fall through to surface the original provider failure.
      }
    }
    return { kind: "failed", title: routed.title, message: routed.message };
  }
}

/**
 * The system voice was chosen up front (System Voice preference, or a provider
 * without speech), so success is silent: no provider failed, and the
 * "Using system voice" toast would announce a fallback that never happened.
 */
export async function runSystemVoice(deps: {
  signal: AbortSignal;
  attempt: () => Promise<void>;
}): Promise<PronounceOutcome> {
  try {
    await deps.attempt();
    return { kind: "system" };
  } catch {
    if (deps.signal.aborted) return { kind: "aborted" };
    return { kind: "failed", title: "Pronunciation failed", message: "Could not play the system voice." };
  }
}
