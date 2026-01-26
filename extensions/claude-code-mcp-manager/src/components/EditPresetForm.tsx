import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { updatePreset, Preset } from "../lib/presets";
import { getAvailablePlugins, getPluginDisplayName } from "../lib/settings";

interface Props {
  preset: Preset;
  onUpdated: () => void;
}

export default function EditPresetForm({ preset, onUpdated }: Props) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();

  const availablePlugins = getAvailablePlugins();
  // Include plugins from the preset that might not be in current settings
  const allPlugins = Array.from(
    new Set([...availablePlugins, ...Object.keys(preset.plugins)]),
  );

  const handleSubmit = async (values: Record<string, boolean | string>) => {
    const name = values.name as string;
    const description = values.description as string;

    if (!name?.trim()) {
      setNameError("Name is required");
      return;
    }

    const plugins: Record<string, boolean> = {};
    allPlugins.forEach((p) => {
      plugins[p] = values[p] as boolean;
    });

    updatePreset(preset.id, {
      name: name.trim(),
      description: description?.trim() || "Custom preset",
      plugins,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Preset updated",
      message: name,
    });

    onUpdated();
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={preset.name}
        placeholder="My Custom Preset"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="description"
        title="Description"
        defaultValue={preset.description}
        placeholder="Description of what this preset is for"
      />
      <Form.Separator />
      <Form.Description
        title="Plugins"
        text="Toggle which MCP plugins to enable"
      />
      {allPlugins.map((plugin) => (
        <Form.Checkbox
          key={plugin}
          id={plugin}
          label={getPluginDisplayName(plugin)}
          defaultValue={preset.plugins[plugin] ?? false}
        />
      ))}
    </Form>
  );
}
