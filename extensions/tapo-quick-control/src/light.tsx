import { Action, ActionPanel, Color, Form, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getStrings } from "./lib/i18n";
import { getInfo, setLightPower, setLightColorHS } from "./lib/tapo";
import { Prefs } from "./lib/types";

const COLOR_PRESET_VALUES = {
  red: { hue: 0, sat: 100, tint: Color.Red },
  green: { hue: 120, sat: 100, tint: Color.Green },
  blue: { hue: 240, sat: 100, tint: Color.Blue },
  purple: { hue: 280, sat: 100, tint: Color.Purple },
  orange: { hue: 30, sat: 100, tint: Color.Orange },
  yellow: { hue: 60, sat: 100, tint: Color.Yellow },
  white: { hue: 200, sat: 5, tint: Color.PrimaryText },
};

type ColorPresetKey = keyof typeof COLOR_PRESET_VALUES;

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const strings = getStrings(prefs);

  const [hue, setHue] = useState<string>("200");
  const [sat, setSat] = useState<string>("100");
  const [colorChoice, setColorChoice] = useState<string>("red");
  const [isOn, setIsOn] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const info = await getInfo(prefs, "L530");
        setIsOn(readDeviceOn(info));
      } catch {
        setIsOn(null);
      }
    })();
  }, []);

  const toggleTitle = isOn === null ? strings.toggle : isOn ? strings.close : strings.open;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title={toggleTitle} onAction={() => runToggle(prefs, isOn, setIsOn, strings)} />
          <Action title={strings.open} onAction={() => runPower(prefs, true, setIsOn, strings)} />
          <Action title={strings.close} onAction={() => runPower(prefs, false, setIsOn, strings)} />
          <Action
            title={strings.colorChange}
            onAction={() => runColor(prefs, colorChoice, hue, sat, setIsOn, strings)}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="color" title={strings.color} value={colorChoice} onChange={setColorChoice}>
        {Object.entries(COLOR_PRESET_VALUES).map(([key, preset]) => (
          <Form.Dropdown.Item
            key={key}
            value={key}
            title={strings.colors[key as ColorPresetKey]}
            icon={{ source: Icon.Circle, tintColor: preset.tint }}
          />
        ))}
        <Form.Dropdown.Item value="custom" title={strings.customColor} icon={Icon.Pencil} />
      </Form.Dropdown>
      <Form.TextField id="hue" title={strings.hueLabel} value={hue} onChange={setHue} />
      <Form.TextField id="sat" title={strings.satLabel} value={sat} onChange={setSat} />
    </Form>
  );
}

function readDeviceOn(info: unknown): boolean | null {
  if (!info || typeof info !== "object") return null;
  const data = info as { device_on?: boolean; deviceOn?: boolean };
  if (typeof data.device_on === "boolean") return data.device_on;
  if (typeof data.deviceOn === "boolean") return data.deviceOn;
  return null;
}

async function runToggle(
  prefs: Prefs,
  isOn: boolean | null,
  setIsOn: (v: boolean | null) => void,
  strings: ReturnType<typeof getStrings>,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title: strings.statusChanging });
  try {
    let current = isOn;
    if (current === null) {
      const info = await getInfo(prefs, "L530");
      current = readDeviceOn(info);
    }
    const next = current === null ? true : !current;
    await setLightPower(prefs, next);
    setIsOn(next);
    toast.style = Toast.Style.Success;
    toast.title = next ? strings.lightOpened : strings.lightClosed;
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = strings.failed;
    toast.message = e instanceof Error ? e.message : String(e);
  }
}

async function runPower(
  prefs: Prefs,
  on: boolean,
  setIsOn: (v: boolean | null) => void,
  strings: ReturnType<typeof getStrings>,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title: on ? strings.openingNow : strings.closingNow });
  try {
    await setLightPower(prefs, on);
    setIsOn(on);
    toast.style = Toast.Style.Success;
    toast.title = on ? strings.lightOpened : strings.lightClosed;
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = strings.failed;
    toast.message = e instanceof Error ? e.message : String(e);
  }
}

async function runColor(
  prefs: Prefs,
  choice: string,
  hueInput: string,
  satInput: string,
  setIsOn: (v: boolean | null) => void,
  strings: ReturnType<typeof getStrings>,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title: strings.colorChanging });
  try {
    const preset = COLOR_PRESET_VALUES[choice as ColorPresetKey];
    const hue = preset ? preset.hue : Number(hueInput);
    const sat = preset ? preset.sat : Number(satInput);
    await setLightColorHS(prefs, hue, sat);
    setIsOn(true);
    toast.style = Toast.Style.Success;
    toast.title = strings.colorSet(hue, sat);
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = strings.failed;
    toast.message = e instanceof Error ? e.message : String(e);
  }
}
