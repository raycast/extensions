import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import { readFileSync } from "fs";

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

interface FileGatewayConfig {
  endpoint?: string;
  token?: string;
  remoteMode?: boolean;
}

const LOOPBACK_DEFAULT = "http://127.0.0.1:18789";

function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function isLoopback(endpoint: string): boolean {
  try {
    const hostname = new URL(endpoint).hostname;
    return (
      hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1"
    );
  } catch {
    return /127\.0\.0\.1|localhost/.test(endpoint);
  }
}

function httpEndpointFromRemoteUrl(url: string): string | undefined {
  try {
    const normalized = url.replace(/^ws/i, "http");
    const parsed = new URL(normalized);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimSlash(`${parsed.protocol}//${parsed.host}`);
    }
  } catch {
    // ignore invalid URLs
  }
  return undefined;
}

function readOpenClawFileConfig(): FileGatewayConfig {
  try {
    const raw = readFileSync(
      join(homedir(), ".openclaw", "openclaw.json"),
      "utf8",
    );
    const gateway = (JSON.parse(raw) as { gateway?: Record<string, unknown> })
      .gateway;
    if (!gateway || typeof gateway !== "object") return {};
    const auth = gateway.auth as { token?: string } | undefined;
    const remote = gateway.remote as
      | { token?: string; url?: string }
      | undefined;
    const token =
      (typeof remote?.token === "string" && remote.token.trim()) ||
      (typeof auth?.token === "string" && auth.token.trim()) ||
      undefined;
    const endpoint =
      (typeof remote?.url === "string" &&
        httpEndpointFromRemoteUrl(remote.url)) ||
      undefined;
    const remoteMode = gateway.mode === "remote";
    return { endpoint, token, remoteMode };
  } catch {
    return {};
  }
}

export type ResolvedPreferences = Preferences & {
  endpoint: string;
  token: string;
  agentId: string;
};

/**
 * Raycast prefs win when set. Empty token / leftover localhost default
 * fall back to ~/.openclaw/openclaw.json so node/remote Macs work without
 * a second local gateway.
 */
export function getPreferences<T extends Preferences = Preferences>(): T &
  ResolvedPreferences {
  const prefs = getPreferenceValues<T>();
  const file = readOpenClawFileConfig();
  let endpoint = trimSlash(
    String(prefs.endpoint ?? "").trim() || LOOPBACK_DEFAULT,
  );
  let token = String(prefs.token ?? "").trim();
  const agentId = String(prefs.agentId ?? "").trim() || "main";

  if (!token && file.token) token = file.token;
  if (
    file.endpoint &&
    !isLoopback(file.endpoint) &&
    file.remoteMode &&
    endpoint === LOOPBACK_DEFAULT
  ) {
    endpoint = file.endpoint;
  }

  return { ...prefs, endpoint, token, agentId };
}

function describeHttpError(status: number, body: string): string {
  const snippet = body.replace(/\s+/g, " ").slice(0, 180);
  if (status === 401 || status === 403) {
    return `API error: ${status} Unauthorized. Check API Token: gateway.auth.token on the gateway host, or gateway.remote.token on a node.`;
  }
  if (status === 404 || status === 405) {
    return `API error: ${status}. Enable gateway.http.endpoints.chatCompletions.enabled on the OpenClaw gateway (not on this Mac if it is only a node).`;
  }
  return `API error: ${status} - ${snippet}`;
}

function describeFetchError(error: unknown, endpoint: string): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    /failed to fetch|ECONNREFUSED|NetworkError|Load failed|network/i.test(msg)
  ) {
    if (isLoopback(endpoint)) {
      return `Failed to connect to ${endpoint}. If OpenClaw runs on another machine, set API Endpoint to that host's Tailscale HTTPS URL and do not start a local gateway on this Mac.`;
    }
    return `Failed to connect to ${endpoint}. Check Tailscale/HTTPS reachability and that chatCompletions is enabled on the gateway.`;
  }
  return msg;
}

export async function sendMessage(
  messages: Message[],
  onStream?: (chunk: string) => void,
): Promise<string> {
  const prefs = getPreferences();
  if (!prefs.token) {
    throw new Error(
      "Missing API Token. Set it in extension preferences, or in ~/.openclaw/openclaw.json (gateway.auth.token or gateway.remote.token).",
    );
  }
  const url = `${prefs.endpoint}/v1/chat/completions`;
  const agentId = prefs.agentId || "main";

  const body = {
    model: `openclaw:${agentId}`,
    messages,
    stream: !!onStream,
    user: "raycast-extension", // maintains session state across calls
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${prefs.token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(describeFetchError(error, prefs.endpoint));
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(describeHttpError(response.status, text));
  }

  if (onStream && response.body) {
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
    const data = (await response.json()) as ChatCompletionResponse;
    return data.choices[0]?.message?.content || "";
  }
}

export async function askQuestion(question: string): Promise<string> {
  return sendMessage([{ role: "user", content: question }]);
}

interface AsyncSubmitResponse {
  ok: boolean;
  runId: string;
}

export interface AsyncResultResponse {
  status: "pending" | "complete" | "error";
  content?: string;
  error?: string;
}

export async function submitAsyncMessage(
  messages: Message[],
  conversationId: string,
): Promise<string> {
  const prefs = getPreferences();
  if (!prefs.token) {
    throw new Error(
      "Missing API Token. Set it in extension preferences, or in ~/.openclaw/openclaw.json (gateway.auth.token or gateway.remote.token).",
    );
  }
  const url = `${prefs.endpoint}/hooks/agent`;
  const agentId = prefs.agentId || "main";

  let response: Response;
  try {
    response = await fetch(url, {
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
  } catch (error) {
    throw new Error(describeFetchError(error, prefs.endpoint));
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(describeHttpError(response.status, text));
  }

  const data = (await response.json()) as AsyncSubmitResponse;
  return data.runId;
}

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
    if (response.status === 404) {
      return { status: "pending" };
    }
    return { status: "error", error: `Poll failed: ${response.status}` };
  }

  return response.json() as Promise<AsyncResultResponse>;
}
