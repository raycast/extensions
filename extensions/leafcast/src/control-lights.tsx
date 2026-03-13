import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  launchCommand,
  LaunchType,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useDeviceApi } from "./hooks/use-device-api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { useState } from "react";
import tinycolor from "tinycolor2";
import { AddCustomBrightnessForm } from "./components/AddCustomBrightnessForm";
import { CustomColorGrid } from "./components/CustomColorGrid";
import { capitalize, createHsvColorWithName } from "./utils";
import { HsvWithName } from "./types";
import { AddCustomColorForm } from "./components/AddCustomColorForm";

export default function Command() {
  const {
    deviceMetadata,
    deviceToken,
    getDeviceEffects,
    isConnecting,
    setDeviceBrightness,
    setDeviceColor,
    turnOffDevice,
    turnOnDevice,
    updateDeviceEffect,
  } = useDeviceApi();
  const [effects, setEffects] = useCachedState<string[]>("device-effects", deviceMetadata?.effects.effectsList ?? []);
  const [customColors, setCustomColors] = useCachedState<HsvWithName[]>("custom-colors", []);
  const [customBrightnessValues, setCustomBrightnessValues] = useCachedState<number[]>("custom-brightness-values", []);
  const [isLoadingEffects, setIsLoadingEffects] = useState<boolean>(false);

  async function doSetDeviceBrightness(brightness: number) {
    await setDeviceBrightness(brightness);
    await showToast({ title: `Brightness set to ${brightness}%`, style: Toast.Style.Success });
  }

  async function doGetDeviceEffects() {
    setIsLoadingEffects(true);
    const effects = await getDeviceEffects();
    setEffects(effects);
    setIsLoadingEffects(false);
  }

  async function doUpdateDeviceEffect(effect: string) {
    await updateDeviceEffect(effect);
    await showToast({ title: `Effect set to ${effect}`, style: Toast.Style.Success });
  }

  async function launchPairDeviceCommand() {
    await launchCommand({ name: "pair-device", type: LaunchType.UserInitiated });
  }

  async function handleAddCustomBrightnessValue(value: number) {
    if (customBrightnessValues.includes(value)) {
      showFailureToast("That value already exists.");
      return;
    }

    setCustomBrightnessValues((vals) => [...vals, value]);
    await showToast({ title: "Custom brightness value added successfully", style: Toast.Style.Success });
  }

  async function handleSetCustomColor(color: tinycolor.ColorFormats.HSV) {
    const hsvColor = createHsvColorWithName(color);

    setCustomColors((colors) => [...colors.filter((color) => color.name !== hsvColor.name), hsvColor]);

    await setDeviceColor(color);
  }

  async function clearCustomBrightnessValues() {
    if (
      await confirmAlert({
        title: "Are you sure you want to delete all of your custom brightness values?",
        primaryAction: {
          title: "Yes, Delete Them",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      setCustomBrightnessValues([]);
      await showToast({ title: "Custom brightness values have been cleared", style: Toast.Style.Success });
    }
  }

  async function clearCustomColors() {
    if (
      await confirmAlert({
        title:
          "Are you sure you want to delete all of your custom colors? This will not delete any of the effects you have saved on your device.",
        primaryAction: {
          title: "Yes, Delete Them",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      setCustomColors([]);
      await showToast({ title: "Custom colors have been cleared", style: Toast.Style.Success });
    }
  }

  async function handleDeleteCustomColor(color: HsvWithName) {
    setCustomColors((colors) => colors.filter((currentColor) => currentColor.name !== color.name));
    await showToast({ title: `${color.name} was deleted`, style: Toast.Style.Success });
  }

  return (
    <List>
      {Boolean(deviceMetadata) && Boolean(deviceToken) && (
        <List.Section title={deviceMetadata?.name}>
          <List.Item
            title="Power"
            icon={Icon.Power}
            accessories={[
              {
                icon: {
                  source: Icon.CircleFilled,
                  tintColor: deviceMetadata
                    ? deviceMetadata.state.on.value
                      ? Color.Green
                      : Color.Red
                    : Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Submenu title="Turn Your Device On or Off">
                  <Action
                    title="Turn On"
                    onAction={turnOnDevice}
                    icon={{ source: Icon.Power, tintColor: Color.Green }}
                  />
                  <Action
                    title="Turn Off"
                    onAction={turnOffDevice}
                    icon={{ source: Icon.Power, tintColor: Color.Red }}
                  />
                </ActionPanel.Submenu>
              </ActionPanel>
            }
          />
          <List.Item
            title="Select effect"
            accessories={[{ text: deviceMetadata?.effects.select.replace("*Solid*", "Solid Color") }]}
            icon={Icon.Stars}
            actions={
              <ActionPanel>
                <ActionPanel.Submenu title="Select an Effect" onOpen={doGetDeviceEffects} isLoading={isLoadingEffects}>
                  {effects.map((effect) => (
                    <Action title={effect} key={effect} onAction={() => doUpdateDeviceEffect(effect)} />
                  ))}
                </ActionPanel.Submenu>
              </ActionPanel>
            }
          />
          <List.Item
            title="Manage brightness"
            accessories={[{ text: `${deviceMetadata?.state.brightness.value.toString()}%` }]}
            icon={Icon.LightBulb}
            actions={
              <ActionPanel>
                <ActionPanel.Submenu title="Select a Brightness">
                  {!!customBrightnessValues.length && (
                    <ActionPanel.Section title="Custom Values">
                      {customBrightnessValues.map((value) => (
                        <Action
                          title={`${value}% Brightness`}
                          key={value}
                          onAction={() => doSetDeviceBrightness(value)}
                        />
                      ))}
                    </ActionPanel.Section>
                  )}
                  {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((brightness) => (
                    <Action
                      title={`${brightness}% Brightness`}
                      key={brightness}
                      onAction={() => doSetDeviceBrightness(brightness)}
                    />
                  ))}
                </ActionPanel.Submenu>
                <Action.Push
                  title="Add Custom Brightness"
                  icon={Icon.PlusCircle}
                  target={<AddCustomBrightnessForm onAddCustomBrightnessValue={handleAddCustomBrightnessValue} />}
                />
                {!!customBrightnessValues.length && (
                  <Action
                    title="Clear Custom Brightness List"
                    icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                    onAction={clearCustomBrightnessValues}
                    style={Action.Style.Destructive}
                  />
                )}
              </ActionPanel>
            }
          />
          <List.Item
            title="Set Color"
            icon={Icon.Swatch}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Set Color"
                  icon={Icon.Swatch}
                  target={
                    <CustomColorGrid
                      colors={customColors}
                      onSetCustomColor={handleSetCustomColor}
                      onDeleteCustomColor={handleDeleteCustomColor}
                    />
                  }
                />
                <Action.Push
                  title="Add Custom Color"
                  icon={Icon.PlusCircle}
                  target={<AddCustomColorForm onSetCustomColor={handleSetCustomColor} />}
                />
                {!!customColors.length && (
                  <Action
                    title="Clear Custom Colors List"
                    icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                    onAction={clearCustomColors}
                    style={Action.Style.Destructive}
                  />
                )}
                <ActionPanel.Section title="Custom Colors">
                  {customColors.map((color) => (
                    <Action
                      title={capitalize(color.name)}
                      key={color.name}
                      onAction={() => handleSetCustomColor(color.hsv)}
                    />
                  ))}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {!deviceToken && !isConnecting && (
        <List.EmptyView
          title="Device not paired"
          icon={Icon.LivestreamDisabled}
          description="Before you can control your Nanoleaf panels with Raycast, you must first pair your device."
          actions={
            <ActionPanel>
              <ActionPanel.Submenu title="Pair Device">
                <Action title="Pair Device" icon={Icon.Plug} onAction={launchPairDeviceCommand} />
              </ActionPanel.Submenu>
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
