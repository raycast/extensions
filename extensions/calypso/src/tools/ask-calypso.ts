import { Endpoint, endpoints, health, prefs, runConversation } from "../calypso";

type Input = {
  /** The question to put to CALYPSO. Include any context it needs — this is a fresh conversation. */
  question: string;
};

/**
 * Hands a whole question to CALYPSO and returns her answer.
 *
 * The other tools give Raycast's model access to the *stack*; this one gives it
 * access to the *model*. CALYPSO is the security-tuned rig with her own tool
 * loop, so an adversarial or LLM-security question gets answered by the model
 * that was built for it rather than by a general assistant that merely searched.
 *
 * She runs her own web_search / rag_search rounds internally, so the answer
 * comes back already grounded.
 */
export default async function askCalypso(input: Input): Promise<string> {
  const p = prefs();

  let chosen: Endpoint | null = null;
  for (const ep of endpoints(p, p.preferredEndpoint || "auto")) {
    if (await health(ep, p)) {
      chosen = ep;
      break;
    }
  }
  if (!chosen) {
    return "No CALYPSO endpoint responded — both rigs look asleep and no cloud fallback is configured.";
  }

  // Raycast tools return a value rather than streaming, so collect the run.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 240_000);
  let answer = "";
  const used: string[] = [];
  try {
    for await (const ev of runConversation(chosen, p, [{ role: "user", content: input.question }], ctrl.signal)) {
      if (ev.content) answer += ev.content;
      if (ev.toolCall) used.push(ev.toolCall);
      if (ev.done) break;
    }
  } catch (e) {
    return `CALYPSO failed: ${(e as Error).message}`;
  } finally {
    clearTimeout(timer);
  }

  const trace = used.length
    ? `\n\n_(${chosen.label ?? chosen.model} · ${used.join(", ")})_`
    : `\n\n_(${chosen.label ?? chosen.model})_`;
  return (answer.trim() || "CALYPSO returned an empty answer.") + trace;
}
