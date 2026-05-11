import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  createPreset,
  DEFAULT_PRESETS,
  formatResolution,
  getCustomPresets,
  Preset,
  saveCustomPresets,
} from "./presets";

export default function Command() {
  const { data: custom = [], isLoading, revalidate } = useCachedPromise(getCustomPresets);

  async function deletePreset(preset: Preset) {
    if (
      await confirmAlert({
        title: "Delete Preset",
        message: `Delete "${preset.name}" (${formatResolution(preset)})?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const updated = custom.filter((p) => p.id !== preset.id);
      await saveCustomPresets(updated);
      revalidate();
      await showToast({ style: Toast.Style.Success, title: "Preset deleted" });
    }
  }

  async function movePreset(preset: Preset, direction: "up" | "down") {
    const idx = custom.findIndex((p) => p.id === preset.id);
    if (idx === -1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= custom.length) return;

    const updated = [...custom];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    await saveCustomPresets(updated);
    revalidate();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search presets...">
      <List.Section title="Custom Presets">
        {custom.map((preset, idx) => (
          <List.Item
            key={preset.id}
            title={preset.name}
            subtitle={formatResolution(preset)}
            icon={Icon.Video}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Preset"
                  icon={Icon.Pencil}
                  target={<PresetForm preset={preset} onSave={revalidate} />}
                />
                <Action
                  title="Delete Preset"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => deletePreset(preset)}
                />
                {idx > 0 && (
                  <Action
                    title="Move Up"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                    onAction={() => movePreset(preset, "up")}
                  />
                )}
                {idx < custom.length - 1 && (
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                    onAction={() => movePreset(preset, "down")}
                  />
                )}
                <Action.Push
                  title="Create New Preset"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<PresetForm onSave={revalidate} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Default Presets">
        {DEFAULT_PRESETS.map((preset) => (
          <List.Item
            key={preset.id}
            title={preset.name}
            subtitle={formatResolution(preset)}
            icon={Icon.Video}
            accessories={[{ tag: "Built-in" }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create New Preset"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<PresetForm onSave={revalidate} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {custom.length === 0 && (
        <List.Section title=" ">
          <List.Item
            title="Create New Preset"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push title="Create New Preset" icon={Icon.Plus} target={<PresetForm onSave={revalidate} />} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function PresetForm({ preset, onSave }: { preset?: Preset; onSave: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; width: string; height: string }) {
    const name = values.name.trim();
    const width = Number(values.width);
    const height = Number(values.height);

    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }
    if (isNaN(width) || width <= 0 || isNaN(height) || height <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Width and height must be positive numbers" });
      return;
    }

    const custom = await getCustomPresets();

    if (preset) {
      const updated = custom.map((p) => (p.id === preset.id ? { ...p, name, width, height } : p));
      await saveCustomPresets(updated);
      await showToast({ style: Toast.Style.Success, title: "Preset updated" });
    } else {
      const newPreset = createPreset(name, width, height);
      await saveCustomPresets([...custom, newPreset]);
      await showToast({ style: Toast.Style.Success, title: "Preset created" });
    }

    onSave();
    pop();
  }

  return (
    <Form
      navigationTitle={preset ? "Edit Preset" : "New Preset"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={preset ? "Save" : "Create"} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="e.g. Demo Recording" defaultValue={preset?.name ?? ""} />
      <Form.TextField
        id="width"
        title="Width"
        placeholder="e.g. 1920"
        defaultValue={preset ? String(preset.width) : ""}
      />
      <Form.TextField
        id="height"
        title="Height"
        placeholder="e.g. 1080"
        defaultValue={preset ? String(preset.height) : ""}
      />
    </Form>
  );
}
