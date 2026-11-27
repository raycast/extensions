import type { ReactNode } from "react";

import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";

import type { CloudDevice } from "@/lib/cloud";

import type { MusicSensitivity } from "@/hooks/useMusicSensitivity";

export type MusicRow = { id: string; name: string; value: number; device: CloudDevice; deviceName: string };

const LEVELS = [25, 50, 75, 100];

/** One music mode of one light (it reacts to sound through its own mic). Applied through the cloud. */
const MusicListItem = ({
  mode,
  sensitivity,
  layoutActions,
}: {
  mode: MusicRow;
  sensitivity: MusicSensitivity;
  layoutActions?: ReactNode;
}) => {
  const start = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Starting ${mode.name}…` });
    try {
      await mode.device.setMusicMode(mode.value, sensitivity.value);
      toast.style = Toast.Style.Success;
      toast.title = `Music mode: ${mode.name}`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't start music mode";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  };

  return (
    <List.Item
      title={mode.name}
      icon={Icon.Music}
      keywords={[mode.deviceName, "music"]}
      accessories={[{ tag: mode.deviceName, tooltip: "Music mode for this device" }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Music Mode">
            <Action title="Start Music Mode" icon={Icon.Play} onAction={start} />
            <ActionPanel.Submenu
              title={`Mic Sensitivity (${sensitivity.value}%)`}
              icon={Icon.Microphone}
              shortcut={{ key: "s", modifiers: ["cmd", "opt"] }}
            >
              {LEVELS.map((level) => (
                <Action
                  key={level}
                  title={`${level}%`}
                  icon={level === sensitivity.value ? Icon.CheckCircle : Icon.Circle}
                  onAction={() => sensitivity.set(level)}
                />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
          {layoutActions}
        </ActionPanel>
      }
    />
  );
};

export default MusicListItem;
