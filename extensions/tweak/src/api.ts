import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  provider: "groq" | "openai" | "anthropic";
  apiKey: string;
}

interface ProviderConfig {
  url: string;
  headers: Record<string, string>;
  buildBody: (
    system: string,
    userMessage: string,
    temperature: number,
  ) => string;
  extractResponse: (data: unknown) => string;
}

const MAX_INPUT_LENGTH = 10000; // ~2500 words max

function getProviderConfig(provider: string, apiKey: string): ProviderConfig {
  switch (provider) {
    case "openai":
      return {
        url: "https://api.openai.com/v1/chat/completions",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        buildBody: (system, userMessage, temperature) =>
          JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 1024,
            temperature,
            messages: [
              { role: "system", content: system },
              { role: "user", content: userMessage },
            ],
          }),
        extractResponse: (data: unknown) => {
          const d = data as { choices: { message: { content: string } }[] };
          return d.choices?.[0]?.message?.content?.trim() || "";
        },
      };

    case "anthropic":
      return {
        url: "https://api.anthropic.com/v1/messages",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        buildBody: (system, userMessage, temperature) =>
          JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            temperature,
            system: system,
            messages: [{ role: "user", content: userMessage }],
          }),
        extractResponse: (data: unknown) => {
          const d = data as { content: { text: string }[] };
          return d.content?.[0]?.text?.trim() || "";
        },
      };

    case "groq":
    default:
      return {
        url: "https://api.groq.com/openai/v1/chat/completions",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        buildBody: (system, userMessage, temperature) =>
          JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 1024,
            temperature,
            messages: [
              { role: "system", content: system },
              { role: "user", content: userMessage },
            ],
          }),
        extractResponse: (data: unknown) => {
          const d = data as { choices: { message: { content: string } }[] };
          return d.choices?.[0]?.message?.content?.trim() || "";
        },
      };
  }
}

function sanitizeErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return "Invalid API key. Check your key in Tweak preferences.";
    case 403:
      return "Access denied. Your API key may not have permission.";
    case 429:
      return "Rate limit exceeded. Wait a moment and try again.";
    case 500:
    case 502:
    case 503:
      return "AI provider is temporarily unavailable. Try again shortly.";
    default:
      return `Request failed (${status}). Check your API key and provider.`;
  }
}

export async function polishText(
  systemPrompt: string,
  text: string,
  temperature = 0.3,
): Promise<string> {
  // Input validation
  if (text.length > MAX_INPUT_LENGTH) {
    throw new Error(
      `Text too long (${text.length} chars). Max is ${MAX_INPUT_LENGTH}.`,
    );
  }

  const prefs = getPreferenceValues<Preferences>();

  if (!prefs.apiKey?.trim()) {
    throw new Error("No API key set. Add it in Tweak preferences.");
  }

  const config = getProviderConfig(prefs.provider, prefs.apiKey.trim());

  // Wrap user input for cleaner AI parsing
  const wrappedMessage = `Message:\n"""\n${text}\n"""`;

  const response = await fetch(config.url, {
    method: "POST",
    headers: config.headers,
    body: config.buildBody(systemPrompt, wrappedMessage, temperature),
  });

  if (!response.ok) {
    throw new Error(sanitizeErrorMessage(response.status));
  }

  const data = await response.json();
  const raw = config.extractResponse(data);

  if (!raw) {
    throw new Error("Empty response from AI. Try again.");
  }

  // Strip surrounding quotes that AI models sometimes add
  const result = raw.replace(/^["]+|["]+$/g, "").trim();

  return result;
}
