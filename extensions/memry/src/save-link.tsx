import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
  Clipboard,
  popToRoot,
  LocalStorage,
} from "@raycast/api";
import { useState, useEffect } from "react";

const API_URL = "https://savememry.com";
const STORAGE_KEY = "memry_api_key";

interface Preferences {
  apiKey: string;
}

function isValidUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function SetupForm({
  onKeySubmitted,
}: {
  onKeySubmitted: (key: string) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  async function handlePasteKey() {
    const clipboard = await Clipboard.readText();
    if (clipboard) {
      setApiKey(clipboard.trim());
    }
  }

  async function handleSubmit() {
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter your API key",
      });
      return;
    }

    if (!trimmedKey.startsWith("memry_")) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid key format",
        message: "API keys start with memry_",
      });
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch(`${API_URL}/api/links`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${trimmedKey}`,
          "User-Agent": "Memry-Raycast/1.0",
        },
      });

      if (response.status === 401) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid API key",
          message: "Check your key and try again",
        });
        return;
      }

      await LocalStorage.setItem(STORAGE_KEY, trimmedKey);
      showToast({
        style: Toast.Style.Success,
        title: "Connected to Memry",
        message: "You're all set to save links",
      });
      onKeySubmitted(trimmedKey);
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Connection failed",
        message: "Could not reach Memry. Try again.",
      });
    } finally {
      setIsValidating(false);
    }
  }

  return (
    <Form
      isLoading={isValidating}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Connect"
            onSubmit={handleSubmit}
          />
          <Action
            title="Paste from Clipboard"
            onAction={handlePasteKey}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
          />
          <Action.OpenInBrowser
            title="Get API Key at savememry.com"
            url="https://savememry.com/integrations"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Welcome to Memry"
        text="Connect your account to start saving links with AI analysis."
      />
      <Form.Separator />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder="memry_..."
        value={apiKey}
        onChange={setApiKey}
        info="Go to savememry.com/integrations to create a key and paste it here."
        autoFocus
      />
      <Form.Separator />
      <Form.Description text="Press Cmd+O to open savememry.com and create a key." />
    </Form>
  );
}

function SaveLinkForm({
  apiKey,
  onDisconnect,
}: {
  apiKey: string;
  onDisconnect: () => void;
}) {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const clipboard = await Clipboard.readText();
      if (clipboard && isValidUrl(clipboard.trim())) {
        setUrl(clipboard.trim());
      }
    })();
  }, []);

  async function handleSubmit() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter a URL",
      });
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Please enter a valid http or https URL",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/links`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "Memry-Raycast/1.0",
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      if (!response.ok) {
        const data = (await response
          .json()
          .catch(() => ({ message: "Request failed" }))) as {
          message?: string;
        };
        if (response.status === 401) {
          showToast({
            style: Toast.Style.Failure,
            title: "API key expired",
            message: "Please reconnect your account.",
          });
          await LocalStorage.removeItem(STORAGE_KEY);
          onDisconnect();
          return;
        }
        throw new Error(
          data.message || `Error ${response.status}`,
        );
      }

      showToast({
        style: Toast.Style.Success,
        title: "Saved to Memry",
        message: "AI is analyzing your link",
      });
      popToRoot();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Check your API key and try again";
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePaste() {
    const clipboard = await Clipboard.readText();
    if (clipboard) {
      setUrl(clipboard.trim());
    }
  }

  async function handleDisconnect() {
    await LocalStorage.removeItem(STORAGE_KEY);
    showToast({
      style: Toast.Style.Success,
      title: "Disconnected",
    });
    onDisconnect();
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Link"
            onSubmit={handleSubmit}
          />
          <Action
            title="Paste from Clipboard"
            onAction={handlePaste}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
          />
          <Action
            title="Disconnect Account"
            onAction={handleDisconnect}
            shortcut={{
              modifiers: ["cmd", "shift"],
              key: "d",
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Memry"
        text="Save a link and AI will analyze it automatically."
      />
      <Form.Separator />
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://..."
        value={url}
        onChange={setUrl}
        autoFocus
      />
      <Form.Separator />
      <Form.Description text="Paste any URL. AI extracts key takeaways, topics, and a summary." />
    </Form>
  );
}

export default function SaveLink() {
  const prefs = getPreferenceValues<Preferences>();
  const [storedKey, setStoredKey] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (
        prefs.apiKey &&
        prefs.apiKey.startsWith("memry_")
      ) {
        setStoredKey(prefs.apiKey);
      } else {
        const saved =
          await LocalStorage.getItem<string>(STORAGE_KEY);
        if (saved && saved.startsWith("memry_")) {
          setStoredKey(saved);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  if (!storedKey) {
    return (
      <SetupForm
        onKeySubmitted={(key) => setStoredKey(key)}
      />
    );
  }

  return (
    <SaveLinkForm
      apiKey={storedKey}
      onDisconnect={() => setStoredKey(null)}
    />
  );
}
