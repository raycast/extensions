import { getPreferenceValues } from "@raycast/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
}

interface StreamDelta {
  choices: {
    delta: {
      content?: string;
    };
  }[];
}

interface ModelsList {
  data?: { id?: string }[];
}

export function getPreferences<T extends Preferences = Preferences>() {
  return getPreferenceValues<T>();
}

function endpointBase(endpoint: string): string {
  return endpoint.replace(/\/+$/, "");
}

function authHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function modelIdsFromList(data: ModelsList): string[] {
  return (data.data || [])
    .map((model) => model.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

export function pickAdvertisedModel(ids: string[]): string {
  if (ids.includes("hermes-agent")) {
    return "hermes-agent";
  }
  return ids[0] || "hermes-agent";
}

/**
 * Prefer an explicit preference. Otherwise use a model advertised by
 * GET /v1/models (hermes-agent when present, else the first id).
 */
export async function resolveModelName(prefs: Preferences): Promise<string> {
  const configured = (prefs.modelName || "").trim();
  if (configured) {
    return configured;
  }

  try {
    const response = await fetch(`${endpointBase(prefs.endpoint)}/v1/models`, {
      method: "GET",
      headers: authHeaders(prefs.token),
    });
    if (response.ok) {
      const data = (await response.json()) as ModelsList;
      return pickAdvertisedModel(modelIdsFromList(data));
    }
  } catch {
    // Fall through to the Hermes default.
  }

  return "hermes-agent";
}

export async function sendMessage(
  messages: Message[],
  onStream?: (chunk: string) => void,
): Promise<string> {
  const prefs = getPreferences();
  const url = `${endpointBase(prefs.endpoint)}/v1/chat/completions`;
  const modelName = await resolveModelName(prefs);

  const body = {
    model: modelName,
    messages,
    stream: !!onStream,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(prefs.token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error: ${response.status} - ${text}`);
  }

  if (onStream && response.body) {
    // Handle streaming response (SSE)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let done = false;
    let sseBuffer = "";

    while (!done) {
      const result = await reader.read();
      done = result.done;

      if (result.value) {
        const chunk = decoder.decode(result.value, { stream: true });
        sseBuffer += chunk;
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed: StreamDelta = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                fullContent += content;
                onStream(content);
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }
      }
    }

    return fullContent;
  } else {
    // Non-streaming response
    const data = (await response.json()) as ChatCompletionResponse;
    return data.choices[0]?.message?.content || "";
  }
}

export async function askQuestion(question: string): Promise<string> {
  return sendMessage([{ role: "user", content: question }]);
}
