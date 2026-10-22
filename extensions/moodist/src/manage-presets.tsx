import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { createDeeplink, showFailureToast, usePromise } from "@raycast/utils";
import { getMix, percent } from "./player";
import { PresetNameForm } from "./preset-form";
import {
  deletePreset,
  describePreset,
  getPresets,
  overwritePreset,
  playPreset,
  PresetStatus,
  presetStatus,
  renamePreset,
  savePreset,
  setPinned,
} from "./presets";

const STATUS_TAGS: Record<PresetStatus, List.Item.Accessory> = {
  playing: { tag: { value: "Playing", color: Color.Green } },
  paused: { tag: { value: "Paused", color: Color.Orange } },
  modified: {
    tag: { value: "Modified", color: Color.Yellow },
    tooltip: "The mix has changed since this preset was loaded",
  },
};

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(async () => ({ presets: await getPresets(), mix: getMix() }));
  const { push } = useNavigation();
  const presets = data?.presets ?? [];
  const mixSize = data ? Object.keys(data.mix.sounds).length : 0;

  async function run(title: string, success: string, fn: () => Promise<unknown>) {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await fn();
      toast.style = Toast.Style.Success;
      toast.title = success;
    } catch (e) {
      toast.hide();
      await showFailureToast(e, { title: "Moodist" });
    } finally {
      revalidate();
    }
  }

  function openSaveForm() {
    push(
      <PresetNameForm
        title="Save Preset"
        onSubmit={async (name) => {
          await savePreset(name, getMix());
          await showToast({ style: Toast.Style.Success, title: `Saved "${name}"` });
          revalidate();
        }}
      />,
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search presets…" navigationTitle="Presets">
      {mixSize > 0 && (
        <List.Section title="Current Mix">
          <List.Item
            title="Save Current Mix as Preset"
            icon={{ source: Icon.Plus, tintColor: Color.Blue }}
            subtitle={`${mixSize} sound${mixSize === 1 ? "" : "s"} in mix`}
            actions={
              <ActionPanel>
                <Action title="Save Current Mix" icon={Icon.SaveDocument} onAction={openSaveForm} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Saved Presets" subtitle={`${presets.length}`}>
        {presets.map((preset) => {
          const status = data ? presetStatus(preset, data.mix) : undefined;
          return (
            <List.Item
              key={preset.id}
              title={preset.name}
              subtitle={describePreset(preset)}
              icon={{ source: preset.pinned ? Icon.Pin : Icon.Music, tintColor: Color.Purple }}
              accessories={[
                ...(status ? [STATUS_TAGS[status]] : []),
                { tag: `${preset.sounds.length} sound${preset.sounds.length === 1 ? "" : "s"}` },
                { tag: `Master ${percent(preset.masterVolume)}` },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={status === "modified" ? "Reload Preset" : "Load Preset"}
                    icon={Icon.Play}
                    onAction={() =>
                      run(`Loading "${preset.name}"`, `Playing "${preset.name}"`, () => playPreset(preset))
                    }
                  />
                  <Action
                    title={preset.pinned ? "Unpin" : "Pin"}
                    icon={preset.pinned ? Icon.PinDisabled : Icon.Pin}
                    shortcut={Keyboard.Shortcut.Common.Pin}
                    onAction={() =>
                      run(preset.pinned ? "Unpinning" : "Pinning", preset.pinned ? "Unpinned" : "Pinned", () =>
                        setPinned(preset.id, !preset.pinned),
                      )
                    }
                  />
                  <Action.CreateQuicklink
                    title="Create Quicklink"
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "l" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "l" },
                    }}
                    quicklink={{
                      name: `Moodist: ${preset.name}`,
                      link: createDeeplink({ command: "load-preset", arguments: { preset: preset.id } }),
                    }}
                  />
                  <Action
                    title="Rename"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onAction={() =>
                      push(
                        <PresetNameForm
                          title="Rename Preset"
                          defaultName={preset.name}
                          onSubmit={async (name) => {
                            await renamePreset(preset.id, name);
                            await showToast({ style: Toast.Style.Success, title: `Renamed to "${name}"` });
                            revalidate();
                          }}
                        />,
                      )
                    }
                  />
                  {mixSize > 0 && (
                    <Action
                      title="Overwrite with Current Mix"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Save}
                      onAction={async () => {
                        if (
                          await confirmAlert({
                            title: "Overwrite Preset?",
                            message: `Replace "${preset.name}" with the current mix?`,
                            primaryAction: { title: "Overwrite", style: Alert.ActionStyle.Destructive },
                          })
                        ) {
                          await run("Saving", `Updated "${preset.name}"`, () => overwritePreset(preset.id, getMix()));
                        }
                      }}
                    />
                  )}
                  <Action
                    title="Delete Preset"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Delete Preset?",
                          message: `Delete "${preset.name}"? This cannot be undone.`,
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        await run("Deleting", `Deleted "${preset.name}"`, () => deletePreset(preset.id));
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
          title={mixSize > 0 ? "No Presets Yet" : "Nothing in the Mix"}
          description={
            mixSize > 0 ? "Save your current mix as a preset" : "Add sounds in Mix Sounds, then save your mix here"
          }
          icon={Icon.Music}
          actions={
            <ActionPanel>
              {mixSize > 0 ? (
                <Action title="Save Current Mix" icon={Icon.SaveDocument} onAction={openSaveForm} />
              ) : (
                <Action
                  title="Open Mixer"
                  icon={Icon.AppWindowGrid3x3}
                  onAction={() => launchCommand({ name: "mix-sounds", type: LaunchType.UserInitiated })}
                />
              )}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
