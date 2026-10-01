import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { discoverModels, type DiscoveredModel } from "./models";
import { DEFAULT_SYSTEM_PROMPT } from "./refine";
import { restoreSettings, settingsKey } from "./saved-settings";

export default function Settings() {
  const [configuration] = useState(() => getPreferenceValues<Preferences>());
  const [models, setModels] = useState<DiscoveredModel[]>();
  const [error, setError] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [modelId, setModelId] = useState("");
  const [effort, setEffort] = useState("");
  const [mode, setMode] = useState<"normal" | "fast">("normal");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const storageKey = settingsKey(configuration.baseUrl);

  useEffect(() => {
    const controller = new AbortController();
    setModels(undefined);
    setError(undefined);
    void Promise.all([
      discoverModels(configuration, controller.signal),
      LocalStorage.getItem<string>(storageKey),
      LocalStorage.getItem<string>("system-prompt"),
    ])
      .then(([discovered, savedModel, savedPrompt]) => {
        if (controller.signal.aborted) return;
        const restored = restoreSettings(discovered, savedModel);
        setModels(discovered);
        setModelId(restored.model.id);
        setEffort(restored.effort);
        setMode(restored.mode);
        if (refresh === 0) setSystemPrompt(savedPrompt ?? DEFAULT_SYSTEM_PROMPT);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : "Could not discover models.");
        }
      });
    return () => controller.abort();
  }, [configuration, storageKey, refresh]);

  const model = models?.find((model) => model.id === modelId);
  const preferencesAction = (
    <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
  );
  const refreshAction = (
    <Action
      title="Refresh Models"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => setRefresh((value) => value + 1)}
    />
  );

  if (!models || !model) {
    return (
      <Detail
        isLoading={!error}
        markdown={error ? `## Could Not Discover Models\n\n${error}` : "Discovering available models…"}
        actions={
          error && (
            <ActionPanel>
              {refreshAction}
              {preferencesAction}
            </ActionPanel>
          )
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Settings"
            icon={Icon.Check}
            onSubmit={async () => {
              await Promise.all([
                LocalStorage.setItem(storageKey, JSON.stringify({ modelId: model.id, effort, mode })),
                LocalStorage.setItem("system-prompt", systemPrompt),
              ]);
              await showToast({ style: Toast.Style.Success, title: "Refine Settings Saved" });
            }}
          />
          {refreshAction}
          <Action
            title="Reset System Prompt"
            icon={Icon.ArrowCounterClockwise}
            onAction={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
          />
          {preferencesAction}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="model"
        title="Model"
        value={modelId}
        onChange={(id) => {
          setModelId(id);
          setEffort("");
          setMode("normal");
        }}
      >
        {models.map((model) => (
          <Form.Dropdown.Item
            key={model.id}
            value={model.id}
            title={model.name === model.id ? model.id : `${model.name} (${model.id})`}
            keywords={[model.id]}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="effort"
        title="Effort"
        value={effort}
        onChange={setEffort}
        info={
          model.efforts.length
            ? model.efforts.find((level) => level.value === effort)?.description
            : "This provider does not advertise reasoning effort options for this model."
        }
      >
        <Form.Dropdown.Item
          value=""
          title={model.defaultEffort ? `Provider Default (${model.defaultEffort})` : "Provider Default"}
        />
        {model.efforts.map((level) => (
          <Form.Dropdown.Item key={level.value} value={level.value} title={level.value} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="mode"
        title="Mode"
        value={mode}
        onChange={(value) => setMode(value === "fast" ? "fast" : "normal")}
        info={
          model.fastTier
            ? "Fast requests priority processing and may cost more. Actual speed depends on the provider."
            : "Fast is available only when advertised by the provider for this model."
        }
      >
        <Form.Dropdown.Item value="normal" title="Normal" />
        {model.fastTier && <Form.Dropdown.Item value="fast" title="Fast" />}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextArea
        id="systemPrompt"
        title="System Prompt"
        value={systemPrompt}
        onChange={setSystemPrompt}
        error={systemPrompt.trim() ? undefined : "Enter a system prompt."}
        info="Used with every model. Save Settings saves your changes. Reset System Prompt restores the original editing instructions."
      />
      <Form.Description title="Provider" text={configuration.baseUrl} />
    </Form>
  );
}
