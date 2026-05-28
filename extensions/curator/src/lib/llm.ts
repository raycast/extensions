import { AI, environment, getPreferenceValues } from "@raycast/api";

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
  const res = await fetch(
    `${p.apiBaseURL.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${p.apiKey}`,
      },
      body: JSON.stringify({
        model: p.apiModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!res.ok)
    throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}
