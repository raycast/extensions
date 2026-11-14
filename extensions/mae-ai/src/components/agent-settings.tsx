import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  AgentSettings,
  AskBackend,
  askBackends,
  effectiveAgentSettings,
  nativeAgentSettings,
  prepareAgentSettings,
} from "../lib/agent-settings";
import {
  loadAgentSettings,
  saveAgentSettings,
} from "../lib/agent-settings-storage";
import { Preferences } from "../lib/preferences";

export default function AgentSettingsView({
  onSave,
}: {
  onSave?: () => void | Promise<void>;
}) {
  const preferences = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();
  const [settings, setSettings] = useState<AgentSettings>(() =>
    nativeAgentSettings(preferences),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const saving = useRef(false);
  useEffect(() => {
    let active = true;
    void loadAgentSettings()
      .then((saved) => {
        if (active) setSettings(effectiveAgentSettings(preferences, saved));
      })
      .catch((failure: unknown) => {
        if (active)
          setError(
            failure instanceof Error ? failure.message : String(failure),
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit() {
    if (loading || saving.current) return;
    saving.current = true;
    try {
      await saveAgentSettings(prepareAgentSettings(settings));
      await onSave?.();
      await showToast({
        style: Toast.Style.Success,
        title: "Agent Settings Saved",
      });
      if (onSave) pop();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      saving.current = false;
    }
  }

  if (loading) return <Form navigationTitle="Remote Agents" isLoading />;

  const hermes = settings.backend === "hermes";
  const credentialTitle = hermes
    ? "Hermes API Key"
    : "OpenClaw Gateway Token / Password";
  const credentialConfigured = Boolean(
    hermes ? preferences.hermesKey : preferences.openclawToken,
  );
  return (
    <Form
      navigationTitle="Remote Agents"
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Settings" onSubmit={submit} />
          <Action
            title={
              settings.backend === "direct"
                ? "Configure AI Provider"
                : `Set ${credentialTitle}`
            }
            icon={Icon.Key}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="backend"
        title="Ask AI Backend"
        value={settings.backend}
        defaultValue={settings.backend}
        storeValue={false}
        onChange={(value) => {
          setSettings((current) => ({
            ...current,
            backend: value as AskBackend,
          }));
          setError("");
        }}
      >
        {[...askBackends]
          .sort(
            (a, b) =>
              Number(b.value === settings.backend) -
              Number(a.value === settings.backend),
          )
          .map((item) => (
            <Form.Dropdown.Item
              key={item.value}
              value={item.value}
              title={item.title}
            />
          ))}
      </Form.Dropdown>
      {settings.backend === "hermes" && (
        <Form.TextField
          key="hermes-url"
          id="hermesUrl"
          title="Hermes Server URL"
          value={settings.hermesUrl}
          storeValue={false}
          placeholder="http://127.0.0.1:8642"
          error={error || undefined}
          info="API server root; include /p/profile if needed. Use a loopback tunnel or private HTTPS ingress."
          onChange={(value) => {
            setSettings((current) => ({ ...current, hermesUrl: value }));
            setError("");
          }}
        />
      )}
      {settings.backend === "openclaw" && (
        <Form.TextField
          key="openclaw-url"
          id="openclawUrl"
          title="OpenClaw Gateway URL"
          value={settings.openclawUrl}
          storeValue={false}
          placeholder="ws://127.0.0.1:18789"
          error={error || undefined}
          info="Native WebSocket gateway. Use a loopback SSH tunnel or trusted wss:// endpoint."
          onChange={(value) => {
            setSettings((current) => ({ ...current, openclawUrl: value }));
            setError("");
          }}
        />
      )}
      {settings.backend !== "direct" ? (
        <Form.Description
          key={`${settings.backend}-credential`}
          title={credentialTitle}
          text={`${credentialConfigured ? "Configured" : "Not configured"}. Use Actions > Set ${credentialTitle} for the secure native password field. Backend and server URLs are configured only on this page.`}
        />
      ) : (
        <Form.Description
          title="Direct Model"
          text="Use Configure AI Provider for the existing API endpoint/key and model dropdown. No remote agent configuration is needed."
        />
      )}
      <Form.Description
        title="Saving"
        text="Save Settings applies your choice everywhere. Pocket AI Settings and the Remote Agents command open this same page. Each backend keeps its own URL when you switch. Reopen Ask AI after changing credentials. Other AI tools keep using the direct provider."
      />
      {error && settings.backend === "direct" && (
        <Form.Description title="Cannot Save Settings" text={error} />
      )}
    </Form>
  );
}
