import { Action, ActionPanel, Color, Detail, Form, Icon, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { readDeviceOn, supportsColor } from "./lib/device-utils";
import { getStrings } from "./lib/i18n";
import { getSelectedDeviceIds } from "./lib/storage";
import { getDeviceInfo, listDevices, setDevicePower, setLightColorHS } from "./lib/tapo";
import { DeviceRecord, Prefs } from "./lib/types";

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

  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string>("");
  const [hue, setHue] = useState<string>("200");
  const [sat, setSat] = useState<string>("100");
  const [colorChoice, setColorChoice] = useState<string>("red");
  const [isOn, setIsOn] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await listDevices(prefs);
        const selectedIds = await getSelectedDeviceIds();
        const lights = list.filter((d) => d.category === "light");
        const filtered =
          prefs.deviceScope === "selected" && selectedIds.length > 0
            ? lights.filter((d) => selectedIds.includes(d.id))
            : lights;
        setDevices(filtered);
        if (filtered.length > 0) setDeviceId(filtered[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedDevice = useMemo(() => devices.find((d) => d.id === deviceId) ?? null, [devices, deviceId]);

  useEffect(() => {
    if (!selectedDevice) {
      setIsOn(null);
      return;
    }
    (async () => {
      try {
        const { info } = await getDeviceInfo(prefs, selectedDevice);
        setIsOn(readDeviceOn(info));
      } catch {
        setIsOn(null);
      }
    })();
  }, [deviceId]);

  if (!loading && devices.length === 0) {
    return <Detail markdown={strings.noDevicesFound} />;
  }

  const toggleTitle = isOn === null ? strings.toggle : isOn ? strings.close : strings.open;
  const colorSupported = supportsColor(selectedDevice?.model, selectedDevice?.category);

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action
            title={toggleTitle}
            onAction={() => runToggle(prefs, selectedDevice, isOn, setIsOn, strings)}
          />
          <Action title={strings.open} onAction={() => runPower(prefs, selectedDevice, true, setIsOn, strings)} />
          <Action title={strings.close} onAction={() => runPower(prefs, selectedDevice, false, setIsOn, strings)} />
          {colorSupported ? (
            <Action
              title={strings.colorChange}
              onAction={() => runColor(prefs, selectedDevice, colorChoice, hue, sat, setIsOn, strings)}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="device" title={strings.selectDevice} value={deviceId} onChange={setDeviceId}>
        {devices.map((device) => (
          <Form.Dropdown.Item key={device.id} value={device.id} title={device.alias || device.model} />
        ))}
      </Form.Dropdown>
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

async function runToggle(
  prefs: Prefs,
  device: DeviceRecord | null,
  isOn: boolean | null,
  setIsOn: (v: boolean | null) => void,
  strings: ReturnType<typeof getStrings>,
) {
  if (!device) return;
  const toast = await showToast({ style: Toast.Style.Animated, title: strings.statusChanging });
  try {
    let current = isOn;
    if (current === null) {
      const { info } = await getDeviceInfo(prefs, device);
      current = readDeviceOn(info);
    }
    const next = current === null ? true : !current;
    await setDevicePower(prefs, device, next);
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
  device: DeviceRecord | null,
  on: boolean,
  setIsOn: (v: boolean | null) => void,
  strings: ReturnType<typeof getStrings>,
) {
  if (!device) return;
  const toast = await showToast({ style: Toast.Style.Animated, title: on ? strings.openingNow : strings.closingNow });
  try {
    await setDevicePower(prefs, device, on);
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
  device: DeviceRecord | null,
  choice: string,
  hueInput: string,
  satInput: string,
  setIsOn: (v: boolean | null) => void,
  strings: ReturnType<typeof getStrings>,
) {
  if (!device) return;
  const toast = await showToast({ style: Toast.Style.Animated, title: strings.colorChanging });
  try {
    const preset = COLOR_PRESET_VALUES[choice as ColorPresetKey];
    const hue = preset ? preset.hue : Number(hueInput);
    const sat = preset ? preset.sat : Number(satInput);
    await setLightColorHS(prefs, device, hue, sat);
    setIsOn(true);
    toast.style = Toast.Style.Success;
    toast.title = strings.colorSet(hue, sat);
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = strings.failed;
    toast.message = e instanceof Error ? e.message : String(e);
  }
}
