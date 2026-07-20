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

export function getPreferences<T extends Preferences = Preferences>() {
  return getPreferenceValues<T>();
}

export async function sendMessage(
  messages: Message[],
  onStream?: (chunk: string) => void,
): Promise<string> {
  const prefs = getPreferences();
  const url = `${prefs.endpoint}/v1/chat/completions`;
  const modelName = prefs.modelName || "hermes-agent";

  const body = {
    model: modelName,
    messages,
    stream: !!onStream,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${prefs.token}`,
    },
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
