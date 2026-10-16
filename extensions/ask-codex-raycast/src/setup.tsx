import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { CodexAppServer, type CodexModel, type ModelSelection } from "./codex";
import { messageOf } from "./conversations";
import { locales, setLocale, t, type Locale } from "./i18n";
import { MODEL_SELECTION_KEY } from "./model-menu";
import {
  connectionSignature,
  SETUP_KEY,
  validSelection,
  type Setup,
} from "./setup-state";

export function SetupWizard({
  preferences,
  previous,
  selection: savedSelection,
  onComplete,
}: {
  preferences: Preferences;
  previous: Setup | null;
  selection: ModelSelection | null;
  onComplete: (setup: Setup) => void;
}) {
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState<Locale | "">(previous?.locale || "");
  const [models, setModels] = useState<CodexModel[]>([]);
  const [model, setModel] = useState("");
  const [effort, setEffort] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);
  const checkingRef = useRef(false);
  const savingRef = useRef(false);
  const clientRef = useRef<CodexAppServer | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clientRef.current?.close();
    };
  }, []);

  async function checkConnection() {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    setError("");
    setCheckedAt(0);
    const client = new CodexAppServer({
      onEvent: () => undefined,
      sandbox: preferences.sandboxMode || "read-only",
      cwd: preferences.workingDirectory,
      codexPath: preferences.codexPath,
      liveSearch: preferences.liveSearch ?? true,
    });
    clientRef.current = client;
    try {
      await client.connect();
      await client.checkAuthentication();
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
      setStep(3);
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
    if (!language || !checkedAt || !validSelection(models, { model, effort })) {
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
        version: 1,
        locale: language,
        selection: { model, effort },
        checkedAt,
        connection: connectionSignature(preferences),
      };
      // Mark setup complete last, so a failed save cannot bypass onboarding.
      await LocalStorage.setItem(
        MODEL_SELECTION_KEY,
        JSON.stringify(setup.selection),
      );
      await LocalStorage.setItem(SETUP_KEY, JSON.stringify(setup));
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
  const title = t("Set Up Codex in Raycast");
  if (step === 1)
    return (
      <Form
        navigationTitle={title}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title={t("Continue")}
              onSubmit={() => {
                if (!language) {
                  void showToast({
                    style: Toast.Style.Failure,
                    title: t("Choose your language"),
                  });
                  return;
                }
                setStep(2);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title={t("1 of 3 · Language")}
          text={t(
            "Choose the interface language. Complete all three steps before chatting. Your existing conversations will be kept.",
          )}
        />
        <Form.Dropdown
          id="language"
          title={t("Language / 语言")}
          value={language}
          onChange={(value) => {
            setLanguage(value as Locale | "");
            setLocale(value || "en");
          }}
        >
          <Form.Dropdown.Item
            value=""
            title={t("Choose language / 选择语言")}
          />
          {locales.map((locale) => (
            <Form.Dropdown.Item
              key={locale.code}
              value={locale.code}
              title={locale.name}
            />
          ))}
        </Form.Dropdown>
      </Form>
    );
  if (step === 2)
    return (
      <Detail
        navigationTitle={title}
        isLoading={checking}
        markdown={[
          `### ${t("2 of 3 · CLI Connection")}`,
          t(
            "Install Codex CLI and run `codex login` in your terminal first. If you use a custom provider, configure it in Codex CLI.",
          ),
          t(
            "This check connects to your local CLI, reads its sign-in status and loads its model catalog. It does not send a prompt. Actual model access is confirmed when you send a message.",
          ),
          checking
            ? t("Checking connection…")
            : error
              ? `**${t("Connection check failed")}**\n\n${error.replace(/[<>]/g, "")}`
              : t("Press Enter to check your connection."),
        ].join("\n\n")}
        actions={
          <ActionPanel>
            <Action
              title={
                checking ? t("Checking connection…") : t("Check CLI Connection")
              }
              icon={Icon.Link}
              onAction={checkConnection}
            />
            {preferencesAction}
            <Action.OpenInBrowser
              title={t("安装 Codex CLI")}
              url="https://github.com/openai/codex#installation"
            />
            <Action
              title={t("Back to Language")}
              onAction={() => {
                if (!checkingRef.current) {
                  setError("");
                  setStep(1);
                }
              }}
            />
          </ActionPanel>
        }
      />
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
                setStep(2);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={t("3 of 3 · Default Model")}
        text={t(
          "CLI connected. Choose a model and effort level. You can change them later in Actions.",
        )}
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
            title={entry.model}
          />
        ))}
      </Form.Dropdown>
      {selected &&
        (selected.efforts.length ? (
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
        ) : (
          <Form.Description
            title={t("Effort Level")}
            text={t("This model does not expose an adjustable effort level.")}
          />
        ))}
      <Form.Description
        text={t(
          "Changing the interface language does not translate your saved chats or force the language of model replies.",
        )}
      />
    </Form>
  );
}
