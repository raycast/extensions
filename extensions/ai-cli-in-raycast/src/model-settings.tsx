import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import type { CodexModel, ModelSelection } from "./codex";
import { messageOf } from "./conversations";
import { setLanguage, t } from "./i18n";
import {
  createProviderClient,
  providerCapabilities,
  type ChatClient,
  type ProviderId,
} from "./provider";
import {
  resolveModelPolicy,
  storageKeys,
  type ModelPolicy,
} from "./session-storage";
import { connectionSignature, validSelection } from "./setup-state";

export function ModelSettings({
  provider,
  onSaved,
}: {
  provider: ProviderId;
  onSaved?: () => void;
}) {
  const preferences = getPreferenceValues<Preferences>();
  setLanguage(preferences.uiLanguage);
  const signature = connectionSignature(preferences, provider);
  const nativeMode = resolveModelPolicy(null, provider, preferences).mode;
  const keys = storageKeys(provider);
  const label = providerCapabilities(provider).label;
  const { pop } = useNavigation();
  const [mode, setMode] = useState<ModelPolicy["mode"]>("last");
  const [selection, setSelection] = useState<ModelSelection>({
    model: "",
    effort: "",
  });
  const [models, setModels] = useState<CodexModel[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const mounted = useRef(false);
  const generation = useRef(0);
  const loadedRef = useRef(false);
  const policyLoadingRef = useRef(false);
  const checkingRef = useRef(false);
  const savingRef = useRef(false);
  const selectionRef = useRef(selection);
  const modelsRef = useRef<CodexModel[]>([]);
  const catalogErrorRef = useRef("");
  const clientRef = useRef<ChatClient | null>(null);
  const rawPolicyRef = useRef<string | undefined>(undefined);

  const active = (epoch: number) =>
    mounted.current && generation.current === epoch;
  function updateSelection(value: ModelSelection) {
    const actual = modelsRef.current.find(
      (entry) => entry.model === value.model,
    );
    const normalized =
      actual && !actual.efforts.length ? { ...value, effort: "" } : value;
    selectionRef.current = normalized;
    setSelection(normalized);
  }

  async function loadPolicy(epoch = generation.current) {
    if (!active(epoch) || policyLoadingRef.current) return;
    policyLoadingRef.current = true;
    loadedRef.current = false;
    setLoaded(false);
    setLoadError("");
    try {
      const raw = await LocalStorage.getItem<string>(keys.modelPolicy);
      if (!active(epoch)) return;
      rawPolicyRef.current = raw;
      const policy = resolveModelPolicy(
        raw,
        provider,
        getPreferenceValues<Preferences>(),
      );
      setMode(policy.mode);
      updateSelection(policy.selection || { model: "", effort: "" });
      loadedRef.current = true;
      setLoaded(true);
    } catch (reason) {
      if (active(epoch)) setLoadError(messageOf(reason));
    } finally {
      if (active(epoch)) policyLoadingRef.current = false;
    }
  }

  async function refreshCatalog(
    epoch = generation.current,
  ): Promise<CodexModel[] | null> {
    if (!active(epoch) || checkingRef.current) return null;
    checkingRef.current = true;
    setChecking(true);
    catalogErrorRef.current = "";
    setCatalogError("");
    modelsRef.current = [];
    setModels([]);
    let client: ChatClient | null = null;
    try {
      client = createProviderClient(provider, {
        onEvent: () => undefined,
        sandbox: preferences.sandboxMode || "read-only",
        cwd: preferences.workingDirectory,
        codexPath: preferences.codexPath,
        agyPath: preferences.agyPath,
        qoderPath: preferences.qoderPath,
        qoderCnPath: preferences.qoderCnPath,
        workbuddyPath: preferences.workbuddyPath,
        geminiPath: preferences.geminiPath,
        autoDetectCli: preferences.autoDetectCli,
        liveSearch: preferences.liveSearch ?? true,
      });
      clientRef.current = client;
      await client.connect();
      if (!active(epoch)) return null;
      await client.checkAuthentication();
      if (!active(epoch)) return null;
      const catalog = await client.listModels();
      if (!active(epoch)) return null;
      if (!catalog.length)
        throw new Error(
          t("No models returned. Check your CLI configuration and try again."),
        );
      modelsRef.current = catalog;
      setModels(catalog);
      updateSelection(selectionRef.current);
      return catalog;
    } catch (reason) {
      if (active(epoch)) {
        catalogErrorRef.current = messageOf(reason);
        setCatalogError(catalogErrorRef.current);
      }
      return null;
    } finally {
      if (clientRef.current === client) clientRef.current = null;
      client?.close();
      if (active(epoch)) {
        checkingRef.current = false;
        setChecking(false);
      }
    }
  }

  useEffect(() => {
    mounted.current = true;
    const epoch = ++generation.current;
    loadedRef.current = false;
    policyLoadingRef.current = false;
    checkingRef.current = false;
    savingRef.current = false;
    setLoaded(false);
    setChecking(true);
    setSaving(false);
    setLoadError("");
    // The development mount probe can cancel this task before launching a CLI.
    const timer = setTimeout(() => {
      void loadPolicy(epoch);
      void refreshCatalog(epoch);
    }, 0);
    return () => {
      mounted.current = false;
      generation.current++;
      clearTimeout(timer);
      clientRef.current?.close();
      clientRef.current = null;
    };
  }, [provider, signature, nativeMode]);

  async function savePolicy() {
    if (!mounted.current || savingRef.current || !loadedRef.current) return;
    const epoch = generation.current;
    const currentMode = resolveModelPolicy(
      rawPolicyRef.current,
      provider,
      getPreferenceValues<Preferences>(),
    ).mode;
    const next: ModelPolicy = {
      mode: currentMode,
      selection: currentMode === "fixed" ? { ...selectionRef.current } : null,
    };
    if (
      next.mode === "fixed" &&
      (checkingRef.current ||
        catalogErrorRef.current ||
        !next.selection ||
        !validSelection(modelsRef.current, next.selection))
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("Choose a valid model and effort level before saving."),
      });
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      if (next.mode === "fixed") {
        const fresh = await refreshCatalog(epoch);
        if (!active(epoch)) return;
        if (
          !fresh ||
          !next.selection ||
          !validSelection(fresh, next.selection)
        ) {
          await showToast({
            style: Toast.Style.Failure,
            title: t(
              "The fixed default is no longer available. Choose a model and effort level again.",
            ),
          });
          return;
        }
      }
      if (!active(epoch)) return;
      if (
        resolveModelPolicy(
          rawPolicyRef.current,
          provider,
          getPreferenceValues<Preferences>(),
        ).mode !== next.mode
      ) {
        await showToast({
          style: Toast.Style.Failure,
          title: t("Default strategy changed. Reopen these settings."),
        });
        return;
      }
      if (next.mode === "fixed") {
        const encoded = JSON.stringify(next);
        await LocalStorage.setItem(keys.modelPolicy, encoded);
        rawPolicyRef.current = encoded;
      }
      // Native preferences own the strategy. Saving in last mode must not
      // erase the validated fixed pair needed when the user switches back.
      if (!active(epoch)) return;
      await showToast({
        style: Toast.Style.Success,
        title: t("Default model policy saved"),
      });
      if (active(epoch)) {
        if (onSaved) onSaved();
        else pop();
      }
    } catch (reason) {
      if (active(epoch))
        await showToast({
          style: Toast.Style.Failure,
          title: t("Could not save settings"),
          message: messageOf(reason),
        });
    } finally {
      if (active(epoch)) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }

  const selectedModel = models.find((entry) => entry.model === selection.model);
  return (
    <Form
      navigationTitle={t("{provider} Defaults", { provider: label })}
      isLoading={(!loaded && !loadError) || checking || saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("Save Defaults")} onSubmit={savePolicy} />
          {loadError && (
            <Action title={t("Retry")} onAction={() => loadPolicy()} />
          )}
          <Action
            title={t("Refresh Model List")}
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={async () => {
              if (!savingRef.current) await refreshCatalog();
            }}
          />
          <Action
            title={t("Change Default Strategy")}
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={t(
          "Defaults apply when opening this CLI or starting a new chat. In-chat changes are temporary and do not change a fixed default.",
        )}
      />
      {loadError && (
        <Form.Description
          title={t("Could not load default settings")}
          text={loadError}
        />
      )}
      <Form.Description
        title={t("Default Strategy")}
        text={
          mode === "fixed"
            ? t("Fixed Model and Effort")
            : t("Use Last Selection")
        }
      />
      {mode === "last" && (
        <Form.Description
          text={t(
            "Reuse this CLI's most recently selected model and effort level.",
          )}
        />
      )}
      {catalogError && (
        <Form.Description
          title={t("Model List Unavailable")}
          text={catalogError}
        />
      )}
      {mode === "fixed" && (
        <>
          <Form.Description
            text={t(
              "Choose a model and its supported effort level. Availability is checked again before saving; no prompt is sent.",
            )}
          />
          <Form.Dropdown
            id="model"
            title={t("Model")}
            value={selectedModel ? selection.model : ""}
            onChange={(value) => {
              if (
                checkingRef.current ||
                savingRef.current ||
                !loadedRef.current
              )
                return;
              const actual = modelsRef.current.find(
                (entry) => entry.model === value,
              );
              if (actual) updateSelection({ model: actual.model, effort: "" });
            }}
          >
            <Form.Dropdown.Item
              value=""
              title={checking ? t("Loading Models…") : t("Choose a model")}
            />
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
          {selectedModel &&
            (selectedModel.efforts.length ? (
              <Form.Dropdown
                id="effort"
                title={t("Effort Level")}
                value={
                  selectedModel.efforts.includes(selection.effort)
                    ? selection.effort
                    : ""
                }
                onChange={(value) => {
                  if (checkingRef.current || savingRef.current) return;
                  const actual = modelsRef.current.find(
                    (entry) => entry.model === selectionRef.current.model,
                  );
                  if (actual?.efforts.includes(value))
                    updateSelection({ model: actual.model, effort: value });
                }}
              >
                <Form.Dropdown.Item
                  value=""
                  title={t("Choose an effort level")}
                />
                {selectedModel.efforts.map((value) => (
                  <Form.Dropdown.Item key={value} value={value} title={value} />
                ))}
              </Form.Dropdown>
            ) : (
              <Form.Description
                title={t("Effort Level")}
                text={t("Not adjustable")}
              />
            ))}
        </>
      )}
    </Form>
  );
}
