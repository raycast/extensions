import { useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { HttpCommandClient, normalizeServerUrl } from "../services/http-client";
import { saveCredentials, type RuntimeCredentials } from "../runtime";

interface SetupFormProps {
  onConnected: (credentials: RuntimeCredentials) => void;
}

export function SetupForm({ onConnected }: SetupFormProps) {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [urlError, setUrlError] = useState<string | undefined>();
  const [tokenError, setTokenError] = useState<string | undefined>();
  const [connecting, setConnecting] = useState(false);

  async function handleSubmit() {
    let hasError = false;
    if (!url.trim()) {
      setUrlError("Server URL is required");
      hasError = true;
    } else {
      try {
        normalizeServerUrl(url);
        setUrlError(undefined);
      } catch (err) {
        setUrlError(err instanceof Error ? err.message : "Invalid URL");
        hasError = true;
      }
    }

    if (!token.trim()) {
      setTokenError("Access token is required");
      hasError = true;
    } else {
      setTokenError(undefined);
    }

    if (hasError) return;

    setConnecting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting to Music Assistant…" });
    try {
      const client = new HttpCommandClient(url.trim(), token.trim());
      await client.command("info");
      const credentials: RuntimeCredentials = {
        serverUrl: url.trim(),
        accessToken: token.trim(),
        demoMode: false,
      };
      await saveCredentials(credentials);
      toast.style = Toast.Style.Success;
      toast.title = "Connected to Music Assistant";
      onConnected(credentials);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Connection Failed";
      toast.message = error instanceof Error ? error.message : "Could not connect to server.";
    } finally {
      setConnecting(false);
    }
  }

  function handleDemo() {
    const credentials: RuntimeCredentials = { demoMode: true };
    void saveCredentials(credentials);
    onConnected(credentials);
  }

  return (
    <Form
      isLoading={connecting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Connect" icon={Icon.Link} onSubmit={handleSubmit} />
          <Action title="Use Demo Mode" icon={Icon.Play} onAction={handleDemo} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Welcome to Audio Assistant"
        text="Connect your Music Assistant server to browse music and control playback. You can also change these later in Extension Preferences."
      />
      <Form.TextField
        id="serverUrl"
        title="Server URL"
        placeholder="http://192.168.1.10:8095"
        value={url}
        onChange={(val) => {
          setUrl(val);
          if (urlError) setUrlError(undefined);
        }}
        error={urlError}
        info="Direct Music Assistant URL or Home Assistant address (e.g. http://192.168.1.50:8095)."
      />
      <Form.PasswordField
        id="accessToken"
        title="Access Token"
        placeholder="Enter your long-lived access token"
        value={token}
        onChange={(val) => {
          setToken(val);
          if (tokenError) setTokenError(undefined);
        }}
        error={tokenError}
        info="Generate a long-lived access token in Music Assistant under Settings → Users → Tokens."
      />
    </Form>
  );
}
