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
  const agentId = prefs.agentId || "main";

  const body = {
    model: `openclaw:${agentId}`,
    messages,
    stream: !!onStream,
    user: "raycast-extension", // maintains session state across calls
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
    // Handle streaming response
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

// Async/background processing types and functions

interface AsyncSubmitResponse {
  ok: boolean;
  runId: string;
}

export interface AsyncResultResponse {
  status: "pending" | "complete" | "error";
  content?: string;
  error?: string;
}

/**
 * Fire-and-forget message submission via hooks endpoint.
 * Returns immediately with a runId that can be polled for results.
 */
export async function submitAsyncMessage(
  messages: Message[],
  conversationId: string,
): Promise<string> {
  const prefs = getPreferences();
  const url = `${prefs.endpoint}/hooks/agent`;
  const agentId = prefs.agentId || "main";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${prefs.token}`,
    },
    body: JSON.stringify({
      model: `openclaw:${agentId}`,
      messages,
      sessionKey: `raycast:${conversationId}`,
      user: "raycast-extension",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Async submit failed: ${response.status} - ${text}`);
  }

  const data = (await response.json()) as AsyncSubmitResponse;
  return data.runId;
}

/**
 * Poll for the result of an async message submission.
 */
export async function pollAsyncResult(
  runId: string,
): Promise<AsyncResultResponse> {
  const prefs = getPreferences();
  const url = `${prefs.endpoint}/api/runs/${encodeURIComponent(runId)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${prefs.token}`,
    },
  });

  if (!response.ok) {
    // Not ready yet or error
    if (response.status === 404) {
      return { status: "pending" };
    }
    return { status: "error", error: `Poll failed: ${response.status}` };
  }

  return response.json() as Promise<AsyncResultResponse>;
}
