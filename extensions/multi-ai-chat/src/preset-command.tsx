import {
  Action,
  ActionPanel,
  Detail,
  environment,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  type LaunchProps,
  open,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildPromptUrlRequests,
  openPromptUrlRequests,
} from "./lib/prompt-urls.js";
import { loadPreset, loadPresets } from "./lib/preset-storage.js";
import {
  buildPresetDeeplink,
  canRunPresetImmediately,
  extractTemplateArguments,
  getTemplateArgumentValue,
  renderPromptTemplate,
  type PromptPreset,
} from "./lib/presets.js";
import { PresetConfigForm } from "./preset-config-form.js";

type RunPresetLaunchProps = LaunchProps<{
  arguments: Arguments.RunPresets;
  launchContext: { presetId?: string };
}>;

export default function RunPresetsCommand(props: RunPresetLaunchProps) {
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initialize() {
      try {
        setPresets(await loadPresets());
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load presets",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    void initialize();
  }, []);

  const requestedPresetId = props.launchContext?.presetId;
  if (requestedPresetId && !isLoading) {
    const preset = presets.find(
      (candidate) => candidate.id === requestedPresetId,
    );
    if (preset) {
      return <RequestedPreset preset={preset} onPresetChange={replacePreset} />;
    }
  }

  function replacePreset(preset: PromptPreset) {
    setPresets((current) =>
      current.map((candidate) =>
        candidate.id === preset.id ? preset : candidate,
      ),
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Choose a preset…">
      <List.EmptyView
        icon={Icon.Stars}
        title={requestedPresetId ? "Preset Not Found" : "No Presets Yet"}
        description={
          requestedPresetId
            ? "This preset may have been deleted. You can remove its Quicklink."
            : "Create presets from the Manage AI Prompt Presets command."
        }
      />
      {!requestedPresetId
        ? presets.map((preset) => (
            <List.Item
              key={preset.id}
              icon={Icon.Stars}
              title={preset.name}
              accessories={[
                {
                  text: `${Object.values(preset.serviceCounts).reduce((sum, count) => sum + count, 0)} tabs`,
                },
              ]}
              actions={
                <ActionPanel>
                  <RunPresetAction
                    preset={preset}
                    onPresetChange={replacePreset}
                  />
                  <Action.Push
                    title="Edit Preset"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={
                      <PresetConfigForm
                        preset={preset}
                        onSave={replacePreset}
                      />
                    }
                  />
                  <Action.CreateQuicklink
                    title="Create Quicklink for Preset"
                    icon={Icon.Link}
                    quicklink={{
                      name: preset.name,
                      link: buildPresetDeeplink(
                        environment.ownerOrAuthorName,
                        environment.extensionName,
                        preset.id,
                      ),
                    }}
                  />
                </ActionPanel>
              }
            />
          ))
        : null}
    </List>
  );
}

export function RunPresetForm({
  preset,
  onPresetChange,
}: {
  preset: PromptPreset;
  onPresetChange: (preset: PromptPreset) => void;
}) {
  const preferences = getPreferenceValues<Preferences.RunPresets>();
  const [isLoading, setIsLoading] = useState(false);
  const [currentPreset, setCurrentPreset] = useState(preset);
  const [argumentErrors, setArgumentErrors] = useState<Record<string, string>>(
    {},
  );
  const argumentsInTemplate = extractTemplateArguments(currentPreset.template);

  useEffect(() => {
    setCurrentPreset(preset);
    setArgumentErrors({});
  }, [preset]);

  function handlePresetChange(nextPreset: PromptPreset) {
    setCurrentPreset(nextPreset);
    onPresetChange(nextPreset);
  }

  async function handleSubmit(values: Record<string, string>) {
    const missingArgument = argumentsInTemplate.find(
      (argument) => !getTemplateArgumentValue(values, argument)?.trim(),
    );
    if (missingArgument) {
      setArgumentErrors(
        Object.fromEntries(
          argumentsInTemplate
            .filter(
              (argument) => !getTemplateArgumentValue(values, argument)?.trim(),
            )
            .map((argument) => [argument, `Enter a value for {${argument}}`]),
        ),
      );
      return false;
    }

    setIsLoading(true);
    try {
      await executePreset(currentPreset, values, preferences.browser);
    } finally {
      setIsLoading(false);
    }
  }

  const totalTabs = Object.values(currentPreset.serviceCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={currentPreset.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run Preset"
            icon={Icon.Airplane}
            onSubmit={handleSubmit}
          />
          <Action.Push
            title="Edit Preset"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={
              <PresetConfigForm
                preset={currentPreset}
                onSave={handlePresetChange}
              />
            }
          />
        </ActionPanel>
      }
    >
      {argumentsInTemplate.map((argument, index) => (
        <Form.TextField
          key={argument}
          id={argument}
          title={formatArgumentTitle(argument)}
          placeholder={`Value for {${argument}}`}
          error={getTemplateArgumentValue(argumentErrors, argument)}
          onBlur={(event) =>
            setArgumentErrors((current) => ({
              ...current,
              [argument]: event.target.value?.trim()
                ? ""
                : `Enter a value for {${argument}}`,
            }))
          }
          onChange={() =>
            setArgumentErrors((current) => ({
              ...current,
              [argument]: "",
            }))
          }
          autoFocus={index === 0}
        />
      ))}
      {argumentsInTemplate.length === 0 ? (
        <Form.Description
          title="Prompt"
          text="This preset has no arguments and is ready to run."
        />
      ) : null}
      <Form.Description
        title="Delivery"
        text={`Opens ${totalTabs} tab${totalTabs === 1 ? "" : "s"}. Prompts are included in browser URLs and may appear in history and sync.`}
      />
    </Form>
  );
}

export function RunPresetAction({
  preset,
  onPresetChange,
}: {
  preset: PromptPreset;
  onPresetChange: (preset: PromptPreset) => void;
}) {
  const preferences = getPreferenceValues<Preferences.RunPresets>();
  const isRunning = useRef(false);

  async function runImmediately() {
    if (isRunning.current) return;

    isRunning.current = true;
    try {
      await executePreset(preset, {}, preferences.browser);
    } finally {
      isRunning.current = false;
    }
  }

  if (canRunPresetImmediately(preset)) {
    return (
      <Action
        title="Run Preset"
        icon={Icon.Airplane}
        onAction={runImmediately}
      />
    );
  }

  return (
    <Action.Push
      title="Run Preset"
      icon={Icon.Airplane}
      target={<RunPresetForm preset={preset} onPresetChange={onPresetChange} />}
    />
  );
}

function RequestedPreset({
  preset,
  onPresetChange,
}: {
  preset: PromptPreset;
  onPresetChange: (preset: PromptPreset) => void;
}) {
  return canRunPresetImmediately(preset) ? (
    <AutoRunPreset preset={preset} onPresetChange={onPresetChange} />
  ) : (
    <RunPresetForm preset={preset} onPresetChange={onPresetChange} />
  );
}

function AutoRunPreset({
  preset,
  onPresetChange,
}: {
  preset: PromptPreset;
  onPresetChange: (preset: PromptPreset) => void;
}) {
  const preferences = getPreferenceValues<Preferences.RunPresets>();
  const [isLoading, setIsLoading] = useState(true);
  const hasAutomaticallyRun = useRef(false);
  const isRunning = useRef(false);

  const runPreset = useCallback(async () => {
    if (isRunning.current) return;

    isRunning.current = true;
    setIsLoading(true);
    try {
      await executePreset(preset, {}, preferences.browser);
    } finally {
      isRunning.current = false;
      setIsLoading(false);
    }
  }, [preferences.browser, preset]);

  useEffect(() => {
    if (hasAutomaticallyRun.current) return;

    hasAutomaticallyRun.current = true;
    void runPreset();
  }, [runPreset]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={preset.name}
      markdown={
        isLoading
          ? "Opening the configured tabs…"
          : "The automatic run finished with an issue. You can retry or edit the preset."
      }
      actions={
        <ActionPanel>
          <Action
            title="Run Preset Again"
            icon={Icon.Airplane}
            onAction={runPreset}
          />
          <Action.Push
            title="Edit Preset"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={
              <PresetConfigForm preset={preset} onSave={onPresetChange} />
            }
          />
        </ActionPanel>
      }
    />
  );
}

async function executePreset(
  preset: PromptPreset,
  values: Record<string, string>,
  browser: string,
): Promise<void> {
  await showToast({
    style: Toast.Style.Animated,
    title: "Preparing preset…",
    message: `Running ${preset.name}`,
  });

  try {
    const storedPreset = await loadPreset(preset.id);
    if (!storedPreset) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Preset is no longer available",
        message: "It may have been deleted in another Raycast window.",
      });
      return;
    }

    const prompt = renderPromptTemplate(storedPreset.template, values);
    const requests = buildPromptUrlRequests(prompt, storedPreset.serviceCounts);
    if (requests.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "This preset has no enabled services",
      });
      return;
    }

    const result = await openPromptUrlRequests(requests, browser, open);
    if (result.failed > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `${result.succeeded}/${result.total} tabs opened`,
        message: result.errors.slice(0, 3).join("; "),
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: `Opened ${result.succeeded} tab${result.succeeded === 1 ? "" : "s"}`,
      });
      await popToRoot();
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function formatArgumentTitle(argument: string): string {
  const words = argument.replaceAll(/[-_]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
