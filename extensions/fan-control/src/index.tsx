import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  closeMainWindow,
  confirmAlert,
  showToast,
  Keyboard,
} from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import { useEffect, useState } from "react";
import { CustomControlForm } from "./custom-control-form";
import { FanStatus } from "./fan-status";
import { readPresets, removePreset, upsertPreset } from "./lib/presets";
import { applyFanProfile, type FanProfile, setFanSpeed } from "./lib/smctl";
import type { CustomPreset } from "./types";

const SMCTL_RELEASE_URL = "https://github.com/leaperone/smctl/releases/latest";
const DAEMON_SETUP_COMMAND = "sudo smctl daemon install";

type BuiltInPreset = {
  name: string;
  subtitle: string;
  profile: FanProfile;
  icon: Icon;
  color: Color;
};

const BUILT_IN_PRESETS: BuiltInPreset[] = [
  {
    name: "Automatic",
    subtitle: "Return control to macOS",
    profile: "auto",
    icon: Icon.ArrowClockwise,
    color: Color.Green,
  },
  {
    name: "Quiet",
    subtitle: "Low-noise built-in fan curve",
    profile: "quiet",
    icon: Icon.Moon,
    color: Color.Blue,
  },
  {
    name: "Blast Off",
    subtitle: "Maximum cooling",
    profile: "full",
    icon: Icon.Bolt,
    color: Color.Red,
  },
];

async function execute(title: string, operation: () => Promise<string>) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Applying ${title}`,
  });

  try {
    await operation();
    toast.style = Toast.Style.Success;
    toast.title = `${title} applied`;
    await closeMainWindow();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Could not apply ${title}`;
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

export default function Command() {
  const [presets, setPresets] = useState<CustomPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    readPresets()
      .then(setPresets)
      .catch(() => {
        showToast({
          style: Toast.Style.Failure,
          title: "Could not load custom presets",
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function savePreset(preset: CustomPreset) {
    setPresets(await upsertPreset(preset));
  }

  async function deletePreset(preset: CustomPreset) {
    const confirmed = await confirmAlert({
      title: `Delete “${preset.name}”?`,
      message: `This removes the saved preset but does not change the current fan speed. Raycast cannot remove Quicklinks through its extension API, so delete “Fan: ${preset.name}” from Quicklinks separately if you added it to root search.`,
      primaryAction: {
        title: "Delete Preset",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    setPresets(await removePreset(preset.id));
    await showToast({
      style: Toast.Style.Success,
      title: "Preset deleted",
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search fan presets…"
      navigationTitle="Fan Control"
    >
      <List.Section title="Quick Presets">
        {BUILT_IN_PRESETS.map((preset) => (
          <List.Item
            key={preset.profile}
            title={preset.name}
            subtitle={preset.subtitle}
            icon={{ source: preset.icon, tintColor: preset.color }}
            actions={
              <ActionPanel>
                <Action
                  title={`Apply ${preset.name}`}
                  icon={Icon.Play}
                  onAction={() =>
                    execute(preset.name, () => applyFanProfile(preset.profile))
                  }
                />
                <CommonActions onSave={savePreset} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Custom Control">
        <List.Item
          title="Set Custom Speed"
          subtitle="Choose an RPM target and optionally save it"
          icon={{ source: Icon.Gauge, tintColor: Color.Orange }}
          actions={
            <ActionPanel>
              <Action.Push
                title="Set Custom Speed"
                icon={Icon.Gauge}
                target={<CustomControlForm onSave={savePreset} />}
              />
              <CommonActions onSave={savePreset} />
            </ActionPanel>
          }
        />
        {presets.map((preset) => (
          <List.Item
            key={preset.id}
            title={preset.name}
            subtitle={`${preset.rpm.toLocaleString()} RPM`}
            icon={{ source: Icon.Star, tintColor: Color.Purple }}
            accessories={[{ text: `${preset.rpm.toLocaleString()} RPM` }]}
            actions={
              <ActionPanel>
                <Action
                  title={`Apply ${preset.name}`}
                  icon={Icon.Play}
                  onAction={() =>
                    execute(preset.name, () => setFanSpeed(preset.rpm))
                  }
                />
                <Action.Push
                  title="Edit Preset"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={
                    <CustomControlForm preset={preset} onSave={savePreset} />
                  }
                />
                <Action.CreateQuicklink
                  title="Add to Root Search"
                  icon={Icon.Star}
                  quicklink={{
                    name: `Fan: ${preset.name}`,
                    link: createDeeplink({
                      ownerOrAuthorName: "nicu_mih",
                      extensionName: "fan-control",
                      command: "apply-preset",
                      arguments: { presetId: preset.id },
                    }),
                    icon: Icon.Star,
                  }}
                />
                <Action
                  title="Delete Preset"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => deletePreset(preset)}
                />
                <Action.Push
                  title="View Fan Status"
                  icon={Icon.List}
                  target={<FanStatus />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="System">
        <List.Item
          title="View Fan Status"
          subtitle="Actual, target, minimum, maximum, and control mode"
          icon={Icon.List}
          actions={
            <ActionPanel>
              <Action.Push title="View Fan Status" target={<FanStatus />} />
              <Action.CopyToClipboard
                title="Copy Daemon Setup Command"
                content={DAEMON_SETUP_COMMAND}
                icon={Icon.Clipboard}
              />
              <Action.OpenInBrowser
                title="Download SMCTL"
                url={SMCTL_RELEASE_URL}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function CommonActions({
  onSave,
}: {
  onSave: (preset: CustomPreset) => Promise<void>;
}) {
  return (
    <>
      <Action.Push
        title="Set Custom Speed"
        icon={Icon.Gauge}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<CustomControlForm onSave={onSave} />}
      />
      <Action.Push
        title="View Fan Status"
        icon={Icon.List}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
        target={<FanStatus />}
      />
    </>
  );
}
