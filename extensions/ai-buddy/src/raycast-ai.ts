import { AI, environment } from "@raycast/api";

/** Raycast AI comes with Raycast Pro: no key and no host, the models are Raycast's. */
export const hasRaycastAI = (): boolean => environment.canAccess(AI);

/**
 * Raycast's models, by id. AI.Model also keeps renamed models as aliases of the same id, so each id is
 * listed once.
 */
export function raycastModels(): string[] {
  return [...new Set(Object.values(AI.Model as Record<string, string>))].sort();
}

/**
 * Streams an answer from Raycast AI. AI.ask takes a single prompt, so the instructions come first and
 * the user's text (already wrapped in its data tags) after them.
 */
export async function* askRaycast(model: string, system: string, user: string, signal: AbortSignal) {
  const chunks: string[] = [];
  let wake: (() => void) | undefined;
  let done = false;
  let failure: unknown;
  const answer = AI.ask(`${system}\n\n${user}`, { model: model as AI.Model, creativity: "low", signal });
  answer.on("data", (chunk) => {
    chunks.push(chunk);
    wake?.();
  });
  answer.then(
    () => {
      done = true;
      wake?.();
    },
    (e) => {
      failure = e;
      done = true;
      wake?.();
    },
  );
  while (true) {
    if (chunks.length) {
      yield chunks.shift() as string;
      continue;
    }
    if (done) break;
    await new Promise<void>((resolve) => (wake = resolve));
    wake = undefined;
  }
  if (failure) throw failure instanceof Error ? failure : new Error(String(failure));
}
