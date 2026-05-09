import {
  Action,
  ActionPanel,
  Detail,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import type { OAuthCredentials } from "@mariozechner/pi-ai/oauth";
import { useEffect, useState } from "react";
import {
  readCredentials,
  redactedCredentialSummary,
  writeCredentials,
} from "./lib/credentials.js";
import { ensureNodeWebCrypto } from "./lib/node-webcrypto.js";
import { assertOAuthCallbackPortAvailable } from "./lib/oauth-port.js";

async function loadOpenAICodexLogin() {
  ensureNodeWebCrypto();
  process.env.PI_OAUTH_CALLBACK_HOST = "localhost";
  const oauth = await import("@mariozechner/pi-ai/oauth");
  await new Promise((resolve) => setTimeout(resolve, 25));
  return oauth.loginOpenAICodex;
}

type State = {
  status: "idle" | "running" | "done" | "error";
  message: string;
};

async function signIn(setState: (state: State) => void): Promise<void> {
  setState({ status: "running", message: "Starting ChatGPT OAuth flow..." });
  await showToast({
    style: Toast.Style.Animated,
    title: "Starting ChatGPT sign in",
  });
  try {
    await assertOAuthCallbackPortAvailable();
    const loginOpenAICodex = await loadOpenAICodexLogin();
    const credentials = (await loginOpenAICodex({
      onAuth: async (info: { url: string; instructions?: string }) => {
        setState({
          status: "running",
          message: "Opening browser for ChatGPT sign in...",
        });
        await open(info.url);
      },
      onPrompt: async (prompt: { message: string }) => {
        setState({
          status: "running",
          message: `${prompt.message}\n\nIf the browser callback does not complete automatically, rerun this command from a local Raycast session.`,
        });
        return "";
      },
      onProgress: (message: string) => {
        setState({ status: "running", message });
      },
    })) as OAuthCredentials | null;

    if (!credentials) {
      throw new Error("OpenAI OAuth returned no credentials.");
    }
    await writeCredentials({
      ...credentials,
      type: "oauth",
      provider: "openai-codex",
    });
    setState({
      status: "done",
      message: "Signed in. You can install the Raycast AI provider.",
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Signed in with ChatGPT",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setState({ status: "error", message });
    await showToast({
      style: Toast.Style.Failure,
      title: "Sign in failed",
      message,
    });
  }
}

export default function Command() {
  const [state, setState] = useState<State>({
    status: "idle",
    message: "Ready to sign in.",
  });
  const [summary, setSummary] = useState("Checking credentials...");

  useEffect(() => {
    readCredentials()
      .then((credentials) => setSummary(redactedCredentialSummary(credentials)))
      .catch((error) =>
        setSummary(error instanceof Error ? error.message : String(error)),
      );
  }, [state.status]);

  return (
    <Detail
      markdown={`# ChatGPT Account Sign In\n\n${state.message}\n\nCurrent credentials: ${summary}`}
      actions={
        <ActionPanel>
          <Action
            title="Sign in with ChatGPT"
            onAction={() => void signIn(setState)}
          />
        </ActionPanel>
      }
      isLoading={state.status === "running"}
    />
  );
}
