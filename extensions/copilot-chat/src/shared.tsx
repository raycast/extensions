import {
  Action,
  ActionPanel,
  Icon,
  Toast,
  showToast,
  LocalStorage,
  Detail,
  Clipboard,
  open,
} from "@raycast/api";
import { useEffect, useState, useRef } from "react";

const clientId = "01ab8ac9400c4e429b23";
const GHO_TOKEN_KEY = "gho_token";
export const DEFAULT_MODEL_KEY = "default_model";

let copilotTokenCache: { token: string; expiresAt: number } | null = null;

export async function getCopilotToken(ghoToken: string): Promise<string> {
  if (copilotTokenCache && copilotTokenCache.expiresAt > Date.now()) {
    return copilotTokenCache.token;
  }

  const res = await fetch("https://api.github.com/copilot_internal/v2/token", {
    headers: {
      Authorization: `token ${ghoToken}`,
      Accept: "application/json",
      "User-Agent": "VSCode/1.80",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to exchange Copilot token: ${text}`);
  }

  const data = (await res.json()) as { token: string; expires_at: number };
  copilotTokenCache = {
    token: data.token,
    expiresAt: data.expires_at * 1000,
  };
  return data.token;
}

export type CopilotModel = {
  id: string;
  name: string;
};

export type DeviceFlowResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

export function useAuth() {
  const [ghoToken, setGhoToken] = useState<string | null>(null);
  const [deviceFlow, setDeviceFlow] = useState<DeviceFlowResponse | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    LocalStorage.getItem<string>(GHO_TOKEN_KEY).then((token) => {
      if (token) {
        setGhoToken(token);
      } else {
        startDeviceFlow(setDeviceFlow);
      }
    });
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let cancelled = false;

    const poll = async () => {
      if (!deviceFlow || cancelled) return;
      try {
        const res = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            client_id: clientId,
            device_code: deviceFlow.device_code,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          }),
        });
        const data = (await res.json()) as {
          access_token?: string;
          error?: string;
        };
        if (data.access_token) {
          if (!cancelled) {
            await LocalStorage.setItem(GHO_TOKEN_KEY, data.access_token);
            setGhoToken(data.access_token);
            showToast({ style: Toast.Style.Success, title: "Authenticated!" });
          }
        } else if (
          data.error === "authorization_pending" ||
          data.error === "slow_down"
        ) {
          timeoutId = setTimeout(poll, deviceFlow.interval * 1000);
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Auth Error",
            message: data.error,
          });
        }
      } catch (e) {
        timeoutId = setTimeout(poll, deviceFlow.interval * 1000);
      }
    };

    if (deviceFlow && !ghoToken) {
      timeoutId = setTimeout(poll, deviceFlow.interval * 1000);
    }
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [deviceFlow, ghoToken]);

  const logout = async () => {
    await LocalStorage.removeItem(GHO_TOKEN_KEY);
    setGhoToken(null);
    startedRef.current = false;
    startDeviceFlow(setDeviceFlow);
  };

  return { ghoToken, deviceFlow, logout };
}

async function startDeviceFlow(setDeviceFlow: (d: DeviceFlowResponse) => void) {
  try {
    const res = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ client_id: clientId, scope: "read:user" }),
    });
    const data = (await res.json()) as DeviceFlowResponse;
    setDeviceFlow(data);
  } catch (e) {
    showToast({ style: Toast.Style.Failure, title: "Failed to start auth" });
  }
}

export function AuthGate({
  ghoToken,
  deviceFlow,
  children,
}: {
  ghoToken: string | null;
  deviceFlow: DeviceFlowResponse | null;
  children: React.ReactNode;
}) {
  if (!ghoToken) {
    if (!deviceFlow) {
      return (
        <Detail isLoading={true} markdown="Initializing authentication..." />
      );
    }
    const markdown = `
# Authenticate with GitHub Copilot

1. Copy your verification code: **\`${deviceFlow.user_code}\`**
2. Open the [GitHub Device Authentication](${deviceFlow.verification_uri}) window.
3. Paste the code and authorize the application.

Waiting for you to authorize...
`;
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Copy Code & Open Browser"
              icon={Icon.Link}
              onAction={async () => {
                await Clipboard.copy(deviceFlow.user_code);
                showToast({
                  style: Toast.Style.Success,
                  title: "Copied code to clipboard",
                });
                await open(deviceFlow.verification_uri);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }
  return <>{children}</>;
}

export async function fetchModels(ghoToken: string): Promise<CopilotModel[]> {
  const copilotToken = await getCopilotToken(ghoToken);
  const res = await fetch("https://api.githubcopilot.com/models", {
    headers: {
      Authorization: `Bearer ${copilotToken}`,
      "Editor-Version": "vscode/1.83.1",
      "Editor-Plugin-Version": "copilot-chat/0.8.0",
      "User-Agent": "GitHubCopilotChat/0.8.0",
    },
  });
  if (!res.ok) throw new Error(`Models API returned ${res.status}`);
  const data = (await res.json()) as { data: { id: string; name?: string }[] };
  const uniqueModels = new Map<string, CopilotModel>();
  data.data.forEach((m) => {
    if (!uniqueModels.has(m.id)) {
      uniqueModels.set(m.id, { id: m.id, name: m.name || m.id });
    }
  });
  return Array.from(uniqueModels.values());
}
export type Message = {
  role: "system" | "user" | "assistant";
  content:
    | string
    | {
        type: "text" | "image_url";
        text?: string;
        image_url?: { url: string };
      }[];
};

export async function streamChat(
  ghoToken: string,
  messages: string | Message[],
  onDelta: (content: string) => void,
  onDone: () => void,
  onError: (err: unknown) => void,
  signal?: AbortSignal,
  modelOverride?: string,
) {
  try {
    const modelToUse =
      modelOverride ||
      (await LocalStorage.getItem<string>(DEFAULT_MODEL_KEY)) ||
      "gpt-4.1";
    const copilotToken = await getCopilotToken(ghoToken);

    const formattedMessages =
      typeof messages === "string"
        ? [{ role: "user", content: messages }]
        : messages;

    const response = await fetch(
      "https://api.githubcopilot.com/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${copilotToken}`,
          "Editor-Version": "vscode/1.83.1",
          "Editor-Plugin-Version": "copilot-chat/0.8.0",
          "User-Agent": "GitHubCopilotChat/0.8.0",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: formattedMessages,
          stream: true,
          model: modelToUse,
          intent: true,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      let errorMessage = `API returned ${response.status}: ${text}`;
      try {
        const parsed = JSON.parse(text);
        if (parsed.error?.message) {
          errorMessage = `API Error: ${parsed.error.message}`;
        } else if (parsed.message) {
          errorMessage = `API Error: ${parsed.message}`;
        } else if (parsed.error) {
          errorMessage = `API Error: ${typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error)}`;
        }
      } catch (e) {
        // use raw text
      }
      throw new Error(errorMessage);
    }

    if (!response.body)
      throw new Error("No response body received from the API");

    const decoder = new TextDecoder("utf-8");
    let content = "";
    let buffer = "";

    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      if (signal?.aborted) break;
      buffer +=
        typeof chunk === "string"
          ? chunk
          : decoder.decode(chunk, { stream: true });

      let newlineIndex;
      while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
              onDelta(content);
            }
          } catch {
            /* skip */
          }
        }
      }
    }
  } catch (error) {
    if (!signal?.aborted) {
      onError(error);
    }
  }
}
