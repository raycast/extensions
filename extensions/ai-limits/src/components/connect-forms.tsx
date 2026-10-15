import { Action, ActionPanel, Clipboard, Form, Icon, open, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { ConnectMethod } from "../lib/connect";
import { Connections } from "../lib/connections";
import { saveConnections } from "../lib/connections-store";
import { realDeps } from "../lib/deps";
import { Provider } from "../lib/providers";
import { startRegion } from "../lib/settings";
import { ProviderError, Settings } from "../lib/types";

// Only the api-key method opens a form, so the form takes that one shape.
export type ApiKeyMethod = Extract<ConnectMethod, { kind: "api-key" }>;

type Region = "global" | "china";

// How often the key form reads the clipboard. A key copied from the key page shows up within a second.
const CLIPBOARD_POLL_MS = 1_000;

// The clipboard can't always be read, such as when another app holds it. A failed read just means nothing is filled in.
async function readClipboard(): Promise<string | undefined> {
  try {
    return await Clipboard.readText();
  } catch {
    return undefined;
  }
}

interface ApiKeyFormProps {
  provider: Provider;
  method: ApiKeyMethod;
  // Used to check the key. The key typed here replaces the one stored for this provider.
  settings: Settings;
  onConnected: (connections: Connections) => void;
}

// Asks for an API key. The provider's key page opens as the form does, and a key copied from that page fills the
// field, so the user copies the key and comes straight back. The key is checked with a real usage request before it is
// saved.
export function ApiKeyForm({ provider, method, settings, onConnected }: ApiKeyFormProps) {
  const { pop } = useNavigation();
  const [key, setKey] = useState("");
  const [region, setRegion] = useState<Region>(() => startRegion(settings, method.region));
  const [keyError, setKeyError] = useState<string>();
  const [checking, setChecking] = useState(false);
  // The clipboard poll runs on a timer, so it reads the field's latest value from here, not from the render it
  // started in.
  const keyRef = useRef("");

  function changeKey(value: string) {
    keyRef.current = value;
    setKey(value);
    setKeyError(undefined);
  }

  useEffect(() => {
    open(method.keyUrl).catch(() => showToast({ style: Toast.Style.Failure, title: "Could not open the key page" }));
  }, [method.keyUrl]);

  // A key copied after the form opens fills the empty field. The clipboard as it was at the start is ignored, so an old
  // key already on the clipboard doesn't appear by surprise.
  useEffect(() => {
    let active = true;
    let previous: string | undefined;
    void readClipboard().then((text) => {
      if (active) {
        previous = text;
      }
    });
    const timer = setInterval(() => {
      void readClipboard().then((text) => {
        if (!active || text === undefined || text === previous) {
          return;
        }
        previous = text;
        const candidate = text.trim();
        if (keyRef.current === "" && method.keyPattern.test(candidate)) {
          keyRef.current = candidate;
          setKey(candidate);
          setKeyError(undefined);
          void showToast({ style: Toast.Style.Success, title: "Key pasted from clipboard" });
        }
      });
    }, CLIPBOARD_POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [method.keyPattern]);

  async function save() {
    const typed = key.trim();
    if (typed === "") {
      setKeyError(`Paste or type your ${provider.name} key`);
      return;
    }
    const patch: Partial<Connections> = { [method.field]: typed };
    if (method.region) {
      patch[method.region] = region;
    }

    setChecking(true);
    // A key the provider refuses is never saved. A network error still saves it, since the trouble may be the
    // connection and not the key, and the list shows what happens on the next refresh.
    let unchecked: string | undefined;
    try {
      await provider.fetchUsage(realDeps(), { ...settings, ...patch });
    } catch (error) {
      const kind = error instanceof ProviderError ? error.kind : "http";
      const message = error instanceof Error ? error.message : String(error);
      if (kind === "auth") {
        setKeyError(message);
        setChecking(false);
        return;
      }
      if (kind === "not-connected") {
        setChecking(false);
        await showToast({ style: Toast.Style.Failure, title: "No key found", message });
        return;
      }
      unchecked = message;
    }

    try {
      onConnected(await saveConnections(patch));
      if (unchecked === undefined) {
        await showToast({ style: Toast.Style.Success, title: `${provider.name} connected` });
      } else {
        await showToast({ style: Toast.Style.Failure, title: "Key saved, not checked", message: unchecked });
      }
      pop();
    } catch (error) {
      setChecking(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save the key",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={`Connect ${provider.name}`}
      isLoading={checking}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Key" icon={Icon.Key} onSubmit={() => void save()} />
          <Action.OpenInBrowser title="Open Key Page" url={method.keyUrl} icon={Icon.Globe} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`The key fills in here when you copy it from the page that just opened. If a key for ${provider.name} is already set in the extension preferences, that key is used instead.`}
      />
      <Form.PasswordField
        id="key"
        title="API Key"
        placeholder={method.placeholder}
        value={key}
        error={keyError}
        onChange={changeKey}
      />
      {method.region && (
        <Form.Dropdown
          id="region"
          title="Region"
          info="Where this key was issued"
          value={region}
          onChange={(value) => setRegion(value as Region)}
        >
          <Form.Dropdown.Item value="global" title="Global" />
          <Form.Dropdown.Item value="china" title="China" />
        </Form.Dropdown>
      )}
    </Form>
  );
}

interface SecretFormProps {
  // Shown as the field's label, and in the saved message.
  title: string;
  field: "claudeSessionKey" | "cursorCookie";
  placeholder: string;
  // Where to find the value, in a sentence or two.
  description: string;
  onConnected: (connections: Connections) => void;
}

// Saves a cookie the user copied from the browser. It is only a fallback for when Connect can't read the login, so the
// value is saved as it is, and the refresh that follows shows whether it works.
export function SecretForm({ title, field, placeholder, description, onConnected }: SecretFormProps) {
  const { pop } = useNavigation();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();

  async function save() {
    const typed = value.trim();
    if (typed === "") {
      setError("Paste the value from your browser");
      return;
    }
    try {
      onConnected(await saveConnections({ [field]: typed }));
      await showToast({ style: Toast.Style.Success, title: `${title} saved` });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Could not save ${title}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Key} onSubmit={() => void save()} />
        </ActionPanel>
      }
    >
      <Form.Description text={description} />
      <Form.PasswordField
        id="value"
        title={title}
        placeholder={placeholder}
        value={value}
        error={error}
        onChange={(next) => {
          setValue(next);
          setError(undefined);
        }}
      />
    </Form>
  );
}
