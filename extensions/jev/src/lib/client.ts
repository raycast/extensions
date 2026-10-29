import { TypeSafeClient, APIError, type EntryType, type Questions } from "@typesafe-ai/sdk";
import { assertSafeInput } from "./input";
import { validateAnswers, type WireQuestion } from "./questions";
export async function evaluate(
  apiKey: string,
  model: string,
  state: EntryType,
  questions: Record<string, WireQuestion>,
  signal?: AbortSignal,
) {
  if (!apiKey.trim())
    throw new Error(
      "Add your TypeSafe API key in Jev extension preferences. Manual filing and keyword bookmark search remain available.",
    );
  if (JSON.stringify(state).length > 100000) throw new Error("This input is too large. Send a smaller selection.");
  assertSafeInput(JSON.stringify({ state, questions }), apiKey.trim());
  const client = new TypeSafeClient({
    apiKey: apiKey.trim(),
    baseURL: "https://api.typesafe.ai",
    defaultModel: model.trim() || "jev-latest",
    timeout: 15000,
    retry: { maxRetries: 1 },
    logLevel: "off",
  });
  try {
    const result = await client.systemOne(
      { state, questions: questions as Questions },
      { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(35000)]) : AbortSignal.timeout(35000) },
    );
    return { answers: validateAnswers(result.answers, questions), model: result.model, usage: result.usage };
  } catch (error) {
    if (error instanceof APIError) {
      if (error.status === 401 || error.status === 403)
        throw new Error("TypeSafe rejected the API key. Check the key and account access in extension preferences.");
      if (error.status === 429) throw new Error("TypeSafe rate limit reached. Please retry shortly.");
      throw new Error(`TypeSafe request failed (${error.status}). Check your model and retry.`);
    }
    // Do not expose SDK request bodies, headers, or credentials in UI errors.
    if (error instanceof Error && /Invalid|Jev response|Jev returned|unknown option/.test(error.message)) throw error;
    throw new Error("Could not complete the Jev request. Check your connection and try again.");
  }
}
