import { Action, ActionPanel, closeMainWindow, Color, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  buildRecordURL,
  formatResolution,
  getAllPresets,
  getScreenInfo,
  Preset,
  presetFitsScreen,
  ScreenDimensions,
  ScreenInfo,
} from "./presets";

export default function Command() {
  const [custom, setCustom] = useState<Preset[]>([]);
  const [defaults, setDefaults] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>({ displays: [], primary: { width: 0, height: 0 } });

  useEffect(() => {
    (async () => {
      const presets = await getAllPresets();
      setCustom(presets.custom);
      setDefaults(presets.defaults);
      setScreenInfo(getScreenInfo());
      setIsLoading(false);
    })();
  }, []);

  function displayForIndex(displayIndex: number): ScreenDimensions {
    const { displays, primary } = screenInfo;
    if (displays.length === 0) return primary;
    return displays[Math.min(displayIndex, displays.length - 1)];
  }

  async function recordAtPreset(preset: Preset, displayIndex = 0) {
    const screen = displayForIndex(displayIndex);
    if (!presetFitsScreen(preset, screen)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Preset exceeds screen size",
        message: "CleanShot will clip to screen bounds",
      });
    }

    const url = buildRecordURL(preset, screen, displayIndex);
    await closeMainWindow();
    open(url);
  }

  function presetItem(preset: Preset) {
    const fits = presetFitsScreen(preset, screenInfo.primary);
    const accessories: List.Item.Accessory[] = [];
    if (!fits) {
      accessories.push({ tag: { value: "Exceeds screen", color: Color.Orange }, icon: Icon.ExclamationMark });
    }

    return (
      <List.Item
        key={preset.id}
        title={preset.name}
        subtitle={formatResolution(preset, screenInfo.primary)}
        icon={Icon.Video}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action title="Record" icon={Icon.Video} onAction={() => recordAtPreset(preset)} />
            {screenInfo.displays.length > 1 &&
              Array.from({ length: screenInfo.displays.length }, (_, i) => (
                <Action
                  key={i}
                  title={`Record on Display ${i + 1}`}
                  icon={Icon.Desktop}
                  onAction={() => recordAtPreset(preset, i)}
                />
              ))}
            <Action.Push title="Manage Presets" icon={Icon.Gear} target={<ManagePresetsLink />} />
          </ActionPanel>
        }
      />
    );
  }

  const { primary } = screenInfo;
  const screenLabel = primary.width > 0 ? `Screen: ${primary.width} × ${primary.height}` : "";

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Search presets... ${screenLabel}`}>
      {custom.length > 0 && <List.Section title="Custom Presets">{custom.map((p) => presetItem(p))}</List.Section>}
      <List.Section title="Default Presets">{defaults.map((p) => presetItem(p))}</List.Section>
    </List>
  );
}

function ManagePresetsLink() {
  return (
    <List>
      <List.EmptyView
        title="Open Manage Recording Presets"
        description="Use the separate 'Manage Recording Presets' command to add or edit presets."
        icon={Icon.Gear}
      />
    </List>
  );
}
