import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { deletePreset, forgetMount, getStatus, moveTo, Position, Preset, PRESET_SLOTS } from "./api";
import { connection } from "./connection";
import { connectionColor } from "./connection-color";
import { describe } from "./format";
import PresetForm from "./preset-form";

const wall: Position = { distance: 0, rotation: 0 };

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(getStatus, [], {
    failureToastOptions: { title: "Could not read the MotionMount" },
  });
  const presets = data?.presets ?? [];
  const status = connection({ isLoading, error });
  const canEdit = status.state === "connected";

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

  const saveCurrent = data && canEdit && presets.length < PRESET_SLOTS && (
    <Action.Push
      title="Save Current Position as Preset"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<PresetForm position={data.position} onSaved={revalidate} />}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search presets" selectedItemId="wall">
      <List.Item
        title="Current Position"
        subtitle={status.state === "failed" ? status.message : data && describe(data.position)}
        icon={Icon.Bluetooth}
        accessories={[{ tag: { value: status.title, color: connectionColor[status.state] } }]}
        actions={
          <ActionPanel>
            {status.state === "failed" && (
              <>
                <Action title="Try Again" icon={Icon.RotateClockwise} onAction={revalidate} />
                <Action
                  title="Forget Saved MotionMount"
                  icon={Icon.Trash}
                  onAction={async () => {
                    await forgetMount();
                    revalidate();
                  }}
                />
              </>
            )}
            {saveCurrent}
          </ActionPanel>
        }
      />
      <List.Section title="Presets">
        <List.Item
          id="wall"
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
                {canEdit && (
                  <Action.Push
                    title="Edit Preset"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={<PresetForm preset={preset} position={preset.position} onSaved={revalidate} />}
                  />
                )}
                {saveCurrent}
                {canEdit && (
                  <Action
                    title="Delete Preset"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => remove(preset)}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
