import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePresets } from "./hooks/use-presets";
import { usePlayback } from "./hooks/use-playback";
import { getSoundById } from "./lib/sound-library";
import type { Preset } from "./types";

function SavePresetForm({ onSave }: { onSave: (name: string) => Promise<void> }) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Save Preset"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Preset"
            icon={Icon.SaveDocument}
            onSubmit={async (values: { name: string }) => {
              if (!values.name.trim()) {
                await showToast({ style: Toast.Style.Failure, title: "Name is required" });
                return;
              }
              await onSave(values.name.trim());
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Preset Name" placeholder="My calm mix..." autoFocus />
    </Form>
  );
}

function RenamePresetForm({ preset, onRename }: { preset: Preset; onRename: (name: string) => Promise<void> }) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Rename Preset"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            icon={Icon.Pencil}
            onSubmit={async (values: { name: string }) => {
              if (!values.name.trim()) {
                await showToast({ style: Toast.Style.Failure, title: "Name is required" });
                return;
              }
              await onRename(values.name.trim());
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="New Name" defaultValue={preset.name} autoFocus />
    </Form>
  );
}

export default function ManagePresetsCommand() {
  const { presets, isLoading, save, remove, rename, updateSounds } = usePresets();
  const { state, loadPreset } = usePlayback();
  const { push } = useNavigation();

  const hasActiveSounds = state.activeSounds.length > 0;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search presets..." navigationTitle="Presets">
      {hasActiveSounds && (
        <List.Section title="Actions">
          <List.Item
            title="Save Current Mix as Preset"
            icon={{ source: Icon.Plus, tintColor: Color.Blue }}
            subtitle={`${state.activeSounds.length} sound${state.activeSounds.length !== 1 ? "s" : ""} in mix`}
            actions={
              <ActionPanel>
                <Action
                  title="Save Current Mix"
                  icon={Icon.SaveDocument}
                  onAction={() => {
                    push(
                      <SavePresetForm
                        onSave={async (name) => {
                          await save(name, state.activeSounds, state.masterVolume);
                          await showToast({ style: Toast.Style.Success, title: `Saved "${name}"` });
                        }}
                      />,
                    );
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Saved Presets" subtitle={`${presets.length} preset${presets.length !== 1 ? "s" : ""}`}>
        {presets.map((preset) => {
          const soundNames = preset.sounds
            .map((s) => getSoundById(s.soundId)?.name)
            .filter(Boolean)
            .join(", ");

          return (
            <List.Item
              key={preset.id}
              title={preset.name}
              subtitle={soundNames}
              accessories={[{ tag: `${preset.sounds.length} sounds` }, { tag: `Vol ${preset.masterVolume}%` }]}
              icon={{ source: Icon.Music, tintColor: Color.Purple }}
              actions={
                <ActionPanel>
                  <Action
                    title="Load Preset"
                    icon={Icon.Play}
                    onAction={async () => {
                      await loadPreset(preset);
                      await showToast({ style: Toast.Style.Success, title: `Loaded "${preset.name}"` });
                    }}
                  />
                  <Action
                    title="Rename"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => {
                      push(
                        <RenamePresetForm
                          preset={preset}
                          onRename={async (name) => {
                            await rename(preset.id, name);
                            await showToast({ style: Toast.Style.Success, title: `Renamed to "${name}"` });
                          }}
                        />,
                      );
                    }}
                  />
                  <Action
                    title="Overwrite with Current Mix"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                    onAction={async () => {
                      if (state.activeSounds.length === 0) {
                        await showToast({ style: Toast.Style.Failure, title: "No sounds in mix" });
                        return;
                      }
                      if (
                        await confirmAlert({
                          title: "Overwrite Preset?",
                          message: `Replace "${preset.name}" with current mix?`,
                          primaryAction: { title: "Overwrite", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        await updateSounds(preset.id, state.activeSounds, state.masterVolume);
                        await showToast({ style: Toast.Style.Success, title: `Updated "${preset.name}"` });
                      }
                    }}
                  />
                  <Action
                    title="Delete Preset"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Delete Preset?",
                          message: `Delete "${preset.name}"? This cannot be undone.`,
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        await remove(preset.id);
                        await showToast({ style: Toast.Style.Success, title: `Deleted "${preset.name}"` });
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {presets.length === 0 && !isLoading && (
        <List.EmptyView
          title={hasActiveSounds ? "No Presets Yet" : "No Mix Active"}
          description={
            hasActiveSounds
              ? "Save your current mix as a preset above"
              : "Add sounds in Mix Sounds, then save your mix here"
          }
          icon={Icon.Music}
          actions={
            !hasActiveSounds ? (
              <ActionPanel>
                <Action
                  title="Open Mixer"
                  icon={Icon.AppWindowGrid3x3}
                  onAction={async () => {
                    await launchCommand({ name: "mix-sounds", type: LaunchType.UserInitiated });
                  }}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      )}
    </List>
  );
}
