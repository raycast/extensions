import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { deletePreset, getStatus, moveTo, Position, Preset, PRESET_SLOTS } from "./api";
import { describe } from "./format";
import PresetForm from "./preset-form";

const wall: Position = { distance: 0, rotation: 0 };

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(getStatus, [], {
    failureToastOptions: { title: "Could not read the MotionMount" },
  });
  const presets = data?.presets ?? [];

  async function remove(preset: Preset) {
    const confirmed = await confirmAlert({
      title: `Delete ${preset.name}?`,
      message: "The preset is removed from the MotionMount itself, so it also disappears from the official app.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting ${preset.name}…` });
    try {
      await deletePreset(preset.index);
      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${preset.name}`;
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Could not delete the preset" });
    }
  }

  const saveCurrent = data && presets.length < PRESET_SLOTS && (
    <Action.Push
      title="Save Current Position as Preset"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<PresetForm position={data.position} onSaved={revalidate} />}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search presets">
      <List.Section title={data ? `Now: ${describe(data.position)}` : undefined}>
        <List.Item
          title="Wall"
          subtitle={describe(wall)}
          icon={Icon.ArrowCounterClockwise}
          actions={
            <ActionPanel>
              <Action title="Move to Wall" icon={Icon.ArrowRight} onAction={() => moveTo("Wall", wall)} />
              {saveCurrent}
            </ActionPanel>
          }
        />
        {presets.map((preset) => (
          <List.Item
            key={preset.index}
            title={preset.name}
            subtitle={describe(preset.position)}
            icon={Icon.Monitor}
            actions={
              <ActionPanel>
                <Action
                  title={`Move to ${preset.name}`}
                  icon={Icon.ArrowRight}
                  onAction={() => moveTo(preset.name, preset.position)}
                />
                <Action.Push
                  title="Edit Preset"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<PresetForm preset={preset} position={preset.position} onSaved={revalidate} />}
                />
                {saveCurrent}
                <Action
                  title="Delete Preset"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => remove(preset)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
