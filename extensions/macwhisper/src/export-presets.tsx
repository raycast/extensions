import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { FileSource } from "./components/FileSource";
import { PresetForm } from "./components/PresetForm";
import { TranscriptionView } from "./components/TranscriptionView";
import { errorMessage } from "./lib/mw";
import { FORMAT_TITLES } from "./lib/options";
import {
  DEFAULT_PRESETS,
  describePreset,
  loadPresets,
  newPresetId,
  Preset,
  presetOptions,
  savePresets,
} from "./lib/presets";

export default function Command() {
  const { data: presets = [], isLoading, mutate, error, revalidate } = useCachedPromise(loadPresets);

  async function persist(next: Preset[], message: string) {
    try {
      await mutate(savePresets(next), { optimisticUpdate: () => next });
      await showToast({ style: Toast.Style.Success, title: message });
    } catch (saveError) {
      await showFailureToast(saveError, { title: "Could not save presets" });
    }
  }

  async function upsert(preset: Preset) {
    const exists = presets.some((item) => item.id === preset.id);
    const next = exists ? presets.map((item) => (item.id === preset.id ? preset : item)) : [...presets, preset];
    await persist(next, exists ? "Preset updated" : "Preset created");
  }

  async function remove(preset: Preset) {
    const confirmed = await confirmAlert({
      title: `Delete "${preset.name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed)
      await persist(
        presets.filter((item) => item.id !== preset.id),
        "Preset deleted",
      );
  }

  async function resetDefaults() {
    const confirmed = await confirmAlert({
      title: "Restore the default presets?",
      message: "Your custom presets will be removed.",
      primaryAction: { title: "Restore", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) await persist(DEFAULT_PRESETS, "Default presets restored");
  }

  const createAction = (
    <Action.Push
      title="Create Preset"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<PresetForm onSave={upsert} />}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search export presets">
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load presets"
          description={errorMessage(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.List}
          title="No export presets"
          description="Create one, or restore the defaults."
          actions={
            <ActionPanel>
              {createAction}
              <Action
                title="Restore Default Presets"
                icon={Icon.ArrowCounterClockwise}
                style={Action.Style.Destructive}
                onAction={resetDefaults}
              />
            </ActionPanel>
          }
        />
      )}
      {presets.map((preset) => (
        <List.Item
          key={preset.id}
          icon={Icon.Document}
          title={preset.name}
          subtitle={describePreset(preset)}
          accessories={[{ tag: preset.format.toUpperCase(), tooltip: FORMAT_TITLES[preset.format] }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Transcribe with Preset"
                icon={Icon.Microphone}
                target={
                  <FileSource actionTitle={`Transcribe with ${preset.name}`}>
                    {(paths) => <TranscriptionView paths={paths} options={presetOptions(preset)} />}
                  </FileSource>
                }
              />
              <ActionPanel.Section>
                <Action.Push
                  title="Edit Preset"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<PresetForm preset={preset} onSave={upsert} />}
                />
                {createAction}
                <Action
                  title="Duplicate Preset"
                  icon={Icon.CopyClipboard}
                  shortcut={Keyboard.Shortcut.Common.Duplicate}
                  onAction={() => upsert({ ...preset, id: newPresetId(), name: `${preset.name} Copy` })}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete Preset"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => remove(preset)}
                />
                <Action
                  title="Restore Default Presets"
                  icon={Icon.ArrowCounterClockwise}
                  style={Action.Style.Destructive}
                  onAction={resetDefaults}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
