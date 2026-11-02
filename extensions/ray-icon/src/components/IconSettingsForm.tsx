import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { ICON_NAMES, iconTitle } from "../lib/icons";
import { parseCustomSvg, previewFile } from "../lib/render";
import { applyPreset, describePreset, FillType, IconSettings, PRESETS } from "../lib/settings";

type Values = {
  icon: string;
  customSvg: string;
  fileName: string;
  preset: string;
  backgroundFillType: string;
  backgroundStartColor: string;
  backgroundEndColor: string;
  backgroundAngle: string;
  backgroundPosition: string;
  backgroundSpread: string;
  backgroundRadius: string;
  backgroundStrokeSize: string;
  backgroundStrokeColor: string;
  backgroundStrokeOpacity: string;
  backgroundRadialGlare: boolean;
  backgroundNoiseTexture: boolean;
  backgroundNoiseTextureOpacity: string;
  iconColor: string;
  iconSize: string;
  iconOffsetX: string;
  iconOffsetY: string;
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const NUMBER_FIELDS = [
  "backgroundAngle",
  "backgroundSpread",
  "backgroundRadius",
  "backgroundStrokeSize",
  "backgroundStrokeOpacity",
  "backgroundNoiseTextureOpacity",
  "iconSize",
  "iconOffsetX",
  "iconOffsetY",
] as const;

/** Full settings form, same knobs as the ray.so/icon sidebar. Pops back with the new settings. */
export function IconSettingsForm(props: { settings: IconSettings; onSubmit: (settings: IconSettings) => void }) {
  const { pop } = useNavigation();
  const { settings } = props;
  const isCustom = Boolean(settings.customSvg);

  function handleSubmit(values: Values) {
    for (const key of ["backgroundStartColor", "backgroundEndColor", "iconColor", "backgroundStrokeColor"] as const) {
      if (!HEX.test(values[key])) {
        showToast({ style: Toast.Style.Failure, title: "Invalid color", message: `${values[key]} is not a hex color` });
        return;
      }
    }
    if (isCustom && !parseCustomSvg(values.customSvg)) {
      showToast({ style: Toast.Style.Failure, title: "That doesn't look like an SVG" });
      return;
    }
    const numbers = Object.fromEntries(NUMBER_FIELDS.map((key) => [key, Number(values[key]) || 0]));
    let next: IconSettings = {
      ...settings,
      ...numbers,
      icon: isCustom ? settings.icon : values.icon,
      customSvg: isCustom ? values.customSvg : undefined,
      fileName: values.fileName || "extension_icon",
      backgroundFillType: values.backgroundFillType as FillType,
      backgroundStartColor: values.backgroundStartColor,
      backgroundEndColor: values.backgroundEndColor,
      backgroundPosition: values.backgroundPosition,
      backgroundStrokeColor: values.backgroundStrokeColor,
      backgroundRadialGlare: values.backgroundRadialGlare,
      backgroundNoiseTexture: values.backgroundNoiseTexture,
      iconColor: values.iconColor,
      selectedPresetIndex: null,
    };
    if (values.preset !== "custom" && Number(values.preset) !== settings.selectedPresetIndex) {
      next = applyPreset(next, Number(values.preset));
    }
    props.onSubmit(next);
    pop();
  }

  return (
    <Form
      navigationTitle="Edit Icon"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {isCustom ? (
        <Form.TextArea id="customSvg" title="SVG" defaultValue={settings.customSvg} />
      ) : (
        <Form.Dropdown id="icon" title="Icon" defaultValue={settings.icon}>
          {ICON_NAMES.map((name) => (
            <Form.Dropdown.Item
              key={name}
              value={name}
              title={iconTitle(name)}
              icon={previewFile({ ...settings, icon: name })}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField id="fileName" title="File Name" defaultValue={settings.fileName} />
      <Form.Separator />
      <Form.Dropdown
        id="preset"
        title="Preset"
        info="Choosing a different preset overrides the colors below."
        defaultValue={settings.selectedPresetIndex === null ? "custom" : String(settings.selectedPresetIndex)}
      >
        <Form.Dropdown.Item value="custom" title="Custom (use fields below)" />
        {PRESETS.map((preset, index) => (
          <Form.Dropdown.Item key={index} value={String(index)} title={describePreset(preset)} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="backgroundFillType" title="Fill" defaultValue={settings.backgroundFillType}>
        <Form.Dropdown.Item value="Linear" title="Linear" />
        <Form.Dropdown.Item value="Radial" title="Radial" />
        <Form.Dropdown.Item value="Solid" title="Solid" />
      </Form.Dropdown>
      <Form.TextField id="backgroundStartColor" title="Start Color" defaultValue={settings.backgroundStartColor} />
      <Form.TextField id="backgroundEndColor" title="End Color" defaultValue={settings.backgroundEndColor} />
      <Form.TextField id="backgroundAngle" title="Angle (Linear)" defaultValue={String(settings.backgroundAngle)} />
      <Form.TextField
        id="backgroundPosition"
        title="Position (Radial)"
        info="Focal point as x,y, e.g. 50%,0%"
        defaultValue={settings.backgroundPosition}
      />
      <Form.TextField
        id="backgroundSpread"
        title="Spread % (Radial)"
        defaultValue={String(settings.backgroundSpread)}
      />
      <Form.TextField id="backgroundRadius" title="Corner Radius" defaultValue={String(settings.backgroundRadius)} />
      <Form.Separator />
      <Form.TextField
        id="backgroundStrokeSize"
        title="Stroke Size"
        defaultValue={String(settings.backgroundStrokeSize)}
      />
      <Form.TextField id="backgroundStrokeColor" title="Stroke Color" defaultValue={settings.backgroundStrokeColor} />
      <Form.TextField
        id="backgroundStrokeOpacity"
        title="Stroke Opacity %"
        defaultValue={String(settings.backgroundStrokeOpacity)}
      />
      <Form.Checkbox id="backgroundRadialGlare" label="Radial glare" defaultValue={settings.backgroundRadialGlare} />
      <Form.Checkbox id="backgroundNoiseTexture" label="Noise texture" defaultValue={settings.backgroundNoiseTexture} />
      <Form.TextField
        id="backgroundNoiseTextureOpacity"
        title="Noise Opacity %"
        defaultValue={String(settings.backgroundNoiseTextureOpacity)}
      />
      <Form.Separator />
      <Form.TextField id="iconColor" title="Icon Color" defaultValue={settings.iconColor} />
      <Form.TextField id="iconSize" title="Icon Size" defaultValue={String(settings.iconSize)} />
      <Form.TextField id="iconOffsetX" title="Offset X" defaultValue={String(settings.iconOffsetX)} />
      <Form.TextField id="iconOffsetY" title="Offset Y" defaultValue={String(settings.iconOffsetY)} />
    </Form>
  );
}
