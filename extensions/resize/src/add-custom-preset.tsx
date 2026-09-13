import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { saveUserPreset, USER_PRESET_PATH } from "./presets";
import { Preset, PresetClass } from "./types";

interface Values {
  name: string;
  width: string;
  height: string;
  presetClass: PresetClass;
}

export default function Command() {
  async function handleSubmit(values: Values) {
    const w = Number(values.width);
    const h = Number(values.height);
    const name = values.name.trim();
    const id = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    if (!name || !id || !Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid preset",
        message:
          !id && name
            ? "Name needs at least one letter or number"
            : "Name plus positive integer width and height required",
      });
      return;
    }

    const coarse = values.presetClass === "phone" || values.presetClass === "tablet";
    const preset: Preset = {
      id,
      name,
      class: values.presetClass,
      viewport: { w, h },
      basis: "custom",
      dpr: 2,
      pointer: coarse ? "coarse" : "fine",
      hover: !coarse,
      strategy: "window",
      warnings: coarse ? ["touch/hover not simulated — geometry only"] : [],
    };

    saveUserPreset(preset);
    await showToast({
      style: Toast.Style.Success,
      title: `Saved "${name}"`,
      message: USER_PRESET_PATH,
    });
    await popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preset" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Client laptop 1366" />
      <Form.TextField id="width" title="Viewport Width" placeholder="1366" />
      <Form.TextField id="height" title="Viewport Height" placeholder="768" />
      <Form.Dropdown id="presetClass" title="Class" defaultValue="custom">
        <Form.Dropdown.Item value="custom" title="Custom" />
        <Form.Dropdown.Item value="laptop" title="Laptop" />
        <Form.Dropdown.Item value="tablet" title="Tablet" />
        <Form.Dropdown.Item value="phone" title="Phone" />
      </Form.Dropdown>
      <Form.Description
        text={`Saved to ${USER_PRESET_PATH} — hand-editable, merges over built-ins by id.`}
      />
    </Form>
  );
}
