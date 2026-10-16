import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { loadLayers, saveLayers } from "./data";
import { DEFAULT_KEY_COLOR, findLayerClash, KEY_COLORS, slugify } from "./schema";
import type { Layer } from "./types";
import { ICON_GROUPS } from "./icons";

export function LayerForm({ existing, mutate }: { existing?: Layer; mutate: () => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();

  async function submit(values: { name: string; icon: string; color: string }) {
    const name = values.name.trim();
    if (!name) {
      setNameError("Name is required");
      return;
    }
    const layers = await loadLayers();
    const clash = findLayerClash(layers, name, existing?.id);
    if (clash) {
      setNameError(`"${clash.name}" already exists`);
      return;
    }
    const icon = values.icon || undefined;
    const color = values.color || undefined;
    if (existing) {
      const index = layers.findIndex((l) => l.id === existing.id);
      if (index >= 0) layers[index] = { ...layers[index], name, icon, color };
    } else {
      layers.push({ id: slugify(name), name, icon, color, entries: [] });
    }
    await saveLayers(layers);
    mutate();
    showToast({ style: Toast.Style.Success, title: existing ? "Layer updated" : "Layer created" });
    pop();
  }

  return (
    <Form
      navigationTitle={existing ? "Edit Layer" : "Create Layer"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={existing ? "Save Layer" : "Create Layer"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Application layer"
        defaultValue={existing?.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.Dropdown id="icon" title="Icon" defaultValue={existing?.icon ?? Icon.Layers}>
        {ICON_GROUPS.map((group) => (
          <Form.Dropdown.Section key={group.title} title={group.title}>
            {group.icons.map((icon) => (
              <Form.Dropdown.Item key={icon.value} title={icon.title} value={icon.value} icon={icon.value} />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="color"
        title="Key color"
        defaultValue={existing?.color ?? ""}
        info="Color of the key tags in this layer"
      >
        <Form.Dropdown.Item
          value=""
          title="Default (Gray)"
          icon={{ source: Icon.CircleFilled, tintColor: DEFAULT_KEY_COLOR }}
        />
        {KEY_COLORS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            title={option.title}
            value={option.value}
            icon={{ source: Icon.CircleFilled, tintColor: option.value }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
