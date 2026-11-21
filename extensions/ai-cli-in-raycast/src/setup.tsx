import { t } from "./i18n";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { type CodexModel, type ModelSelection } from "./codex";
import { messageOf } from "./conversations";

import { ProviderMenu } from "./provider-menu";
import { PROVIDERS, storageKeys } from "./session-storage";
import {
  createProviderClient,
  providerCapabilities,
  type ChatClient,
  type ProviderId,
} from "./provider";
import { connectionSignature, validSelection, type Setup } from "./setup-state";

export function SetupWizard({
  preferences,
  provider,
  onProviderChange,
  previous,
  selection: savedSelection,
  onComplete,
}: {
  preferences: Preferences;
  provider: ProviderId;
  onProviderChange: (value: string) => Promise<void>;
  previous: Setup | null;
  selection: ModelSelection | null;
  onComplete: (setup: Setup) => void;
}) {
  const keys = storageKeys(provider);
  const [step, setStep] = useState(1);
  const [models, setModels] = useState<CodexModel[]>([]);
  const [model, setModel] = useState("");
  const [effort, setEffort] = useState("");
  const [checking, setChecking] = useState(preferences.autoDetectCli !== false);
  const [checkedAt, setCheckedAt] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);
  const checkingRef = useRef(false);
  const savingRef = useRef(false);
  const clientRef = useRef<ChatClient | null>(null);
  useEffect(() => {
    mounted.current = true;
    // Defer startup by one task so React's development mount/cleanup probe
    // cancels the first timer before a CLI process can be launched.
    const autoCheck =
      preferences.autoDetectCli !== false
        ? setTimeout(() => void checkConnection(), 0)
        : undefined;
    return () => {
      mounted.current = false;
      if (autoCheck !== undefined) clearTimeout(autoCheck);
      clientRef.current?.close();
    };
  }, []);

  async function checkConnection() {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    setError("");
    setCheckedAt(0);
    const client = createProviderClient(provider, {
      onEvent: () => undefined,
      sandbox: preferences.sandboxMode || "read-only",
      cwd: preferences.workingDirectory,
      codexPath: preferences.codexPath,
      agyPath: preferences.agyPath,
      qoderPath: preferences.qoderPath,
      qoderCnPath: preferences.qoderCnPath,
      workbuddyPath: preferences.workbuddyPath,
      geminiPath: preferences.geminiPath,
      liveSearch: preferences.liveSearch ?? true,
      autoDetectCli: preferences.autoDetectCli,
    });
    clientRef.current = client;
    try {
      await client.connect();
      if (!mounted.current) return;
      await client.checkAuthentication();
      if (!mounted.current) return;
      const catalog = await client.listModels();
      if (!catalog.length)
        throw new Error(
          t("No models returned. Check your CLI configuration and try again."),
        );
      if (!mounted.current) return;
      setModels(catalog);
      const selected = savedSelection || previous?.selection;
      // Preserve an existing choice only if it is still in the CLI catalog.
      if (selected && validSelection(catalog, selected)) {
        setModel(selected.model);
        setEffort(selected.effort);
      } else {
        setModel("");
        setEffort("");
      }
      setCheckedAt(Date.now());
      setStep(2);
    } catch (reason) {
      if (mounted.current) setError(messageOf(reason));
    } finally {
      client.close();
      clientRef.current = null;
      checkingRef.current = false;
      if (mounted.current) setChecking(false);
    }
  }

  async function finish() {
    if (savingRef.current) return;
    if (!checkedAt || !validSelection(models, { model, effort })) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("Choose a model and effort level to continue"),
      });
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const setup: Setup = {
        version: 2,
        selection: { model, effort },
        checkedAt,
        connection: connectionSignature(preferences, provider),
      };
      // Mark setup complete last, so a failed save cannot bypass onboarding.
      await LocalStorage.setItem(keys.model, JSON.stringify(setup.selection));
      await LocalStorage.setItem(keys.setup, JSON.stringify(setup));
      if (mounted.current) onComplete(setup);
    } catch (reason) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("Could not save settings"),
        message: messageOf(reason),
      });
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  const preferencesAction = (
    <Action
      title={t("CLI Path and Permissions")}
      icon={Icon.Gear}
      onAction={openExtensionPreferences}
    />
  );
  const label = providerCapabilities(provider).label;
  const title = t("Set Up {provider} in Raycast", { provider: label });
  if (step === 1)
    return (
      <Form
        navigationTitle={title}
        isLoading={checking}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title={
                checking ? t("Checking Connection…") : t("Check CLI Connection")
              }
              icon={Icon.Link}
              onSubmit={checkConnection}
            />
            <ProviderMenu
              providers={PROVIDERS}
              selected={provider}
              onSelect={(value) => {
                if (!checkingRef.current) void onProviderChange(value);
              }}
            />
            {preferencesAction}
            {provider === "codex" && (
              <Action.OpenInBrowser
                title={t("Install Codex CLI")}
                url="https://github.com/openai/codex#installation"
              />
            )}
          </ActionPanel>
        }
      >
        <Form.Description
          title={t("Connect CLI")}
          text={
            provider === "codex"
              ? t("Check the CLI and available models. No message is sent.")
              : t(
                  "Check the CLI and available models. Sign-in is verified with your first message.",
                )
          }
        />
        {checking && <Form.Description text={t("Checking Connection…")} />}
        {error && (
          <Form.Description title={t("Connection check failed")} text={error} />
        )}
      </Form>
    );
  const selected = models.find((entry) => entry.model === model);
  return (
    <Form
      navigationTitle={title}
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("Save and Start Chatting")}
            onSubmit={finish}
          />
          <Action
            title={t("Check Connection Again")}
            onAction={() => {
              if (!savingRef.current) {
                setCheckedAt(0);
                setStep(1);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={t("Default Model")}
        text={
          provider === "codex"
            ? t("Choose the model for new messages.")
            : t("Choose a model. CLI Default uses the CLI's own choice.")
        }
      />
      <Form.Dropdown
        id="model"
        title={t("Model")}
        value={model}
        onChange={(value) => {
          if (savingRef.current) return;
          setModel(value);
          setEffort("");
        }}
      >
        <Form.Dropdown.Item value="" title={t("Choose a model")} />
        {models.map((entry) => (
          <Form.Dropdown.Item
            key={entry.model}
            value={entry.model}
            title={
              entry.model === "__cli_default__"
                ? t("CLI Default")
                : entry.displayName || entry.model
            }
          />
        ))}
      </Form.Dropdown>
      {selected && selected.efforts.length > 0 && (
        <Form.Dropdown
          id="effort"
          title={t("Effort Level")}
          value={effort}
          onChange={(value) => {
            if (!savingRef.current) setEffort(value);
          }}
        >
          <Form.Dropdown.Item value="" title={t("Choose an effort level")} />
          {selected.efforts.map((value) => (
            <Form.Dropdown.Item key={value} value={value} title={value} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
