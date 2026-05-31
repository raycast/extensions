import { AI, environment, getPreferenceValues } from "@raycast/api";
import { buildCustomChatRequest, extractCustomChatText } from "./custom-llm";

export class AIUnavailableError extends Error {}

export async function chat(prompt: string): Promise<string> {
  const p = getPreferenceValues<Preferences>();
  const useRaycast =
    p.provider === "raycast" ||
    (p.provider === "auto" && environment.canAccess(AI));

  if (useRaycast) {
    if (!environment.canAccess(AI))
      throw new AIUnavailableError("Raycast AI requires Pro");
    return await AI.ask(prompt, { creativity: "low" });
  }

  if (!p.apiBaseURL || !p.apiKey || !p.apiModel)
    throw new AIUnavailableError(
      "Custom provider needs a base URL, API key, and model",
    );

  const request = buildCustomChatRequest(
    p.apiBaseURL,
    p.apiKey,
    p.apiModel,
    prompt,
  );
  const res = await fetch(request.url, {
    ...request.init,
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok)
    throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return extractCustomChatText(await res.json(), request.protocol);
}
