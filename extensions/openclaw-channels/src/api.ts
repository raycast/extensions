import { type GatewayProfile } from "./profiles";

export interface Message {
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

export interface SendMessageOptions {
  sessionKey?: string;
}

export async function sendMessage(
  profile: GatewayProfile,
  messages: Message[],
  onStream?: (chunk: string) => void,
  options?: SendMessageOptions,
): Promise<string> {
  const url = `${profile.endpoint}/v1/chat/completions`;
  const agentId = profile.agentId || "main";

  const body = {
    model: `openclaw:${agentId}`,
    messages,
    stream: !!onStream,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${profile.token}`,
    "x-openclaw-agent-id": agentId,
  };
  if (options?.sessionKey) {
    headers["x-openclaw-session-key"] = options.sessionKey;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
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
