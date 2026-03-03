import { Action, ActionPanel, closeMainWindow, Color, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  buildRecordURL,
  formatResolution,
  getAllPresets,
  getDisplayCount,
  getScreenDimensions,
  Preset,
  presetFitsScreen,
  ScreenDimensions,
} from "./presets";

export default function Command() {
  const [custom, setCustom] = useState<Preset[]>([]);
  const [defaults, setDefaults] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(1);
  const [screen, setScreen] = useState<ScreenDimensions>({ width: 0, height: 0 });

  useEffect(() => {
    (async () => {
      const presets = await getAllPresets();
      setCustom(presets.custom);
      setDefaults(presets.defaults);
      setDisplayCount(getDisplayCount());
      setScreen(getScreenDimensions());
      setIsLoading(false);
    })();
  }, []);

  async function recordAtPreset(preset: Preset, displayIndex = 0) {
    if (!presetFitsScreen(preset, displayIndex)) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Preset exceeds screen size",
        message: "CleanShot will clip to screen bounds",
      });
    }

    const url = buildRecordURL(preset, displayIndex);
    await closeMainWindow();
    open(url);
  }

  function presetItem(preset: Preset) {
    const fits = presetFitsScreen(preset);
    const accessories: List.Item.Accessory[] = [];
    if (!fits) {
      accessories.push({ tag: { value: "Exceeds screen", color: Color.Orange }, icon: Icon.ExclamationMark });
    }

    return (
      <List.Item
        key={preset.id}
        title={preset.name}
        subtitle={formatResolution(preset, screen)}
        icon={Icon.Video}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action title="Record" icon={Icon.Video} onAction={() => recordAtPreset(preset)} />
            {displayCount > 1 &&
              Array.from({ length: displayCount }, (_, i) => (
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

  const screenLabel = screen.width > 0 ? `Screen: ${screen.width} × ${screen.height}` : "";

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
