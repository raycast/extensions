import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { exec } from "child_process";
import { useEffect, useState } from "react";
import { promisify } from "util";
import { sendSocketCommand, startDaemonIfNotRunning } from "./lib/ipc";

const execAsync = promisify(exec);

interface VolumeState {
  volume: number;
  muted: boolean;
  outputDevice: string;
}

export default function VolumeMixerCommand() {
  const [state, setState] = useState<VolumeState>({
    volume: 50,
    muted: false,
    outputDevice: "Default Output",
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchVolume = async () => {
    try {
      const { stdout } = await execAsync(
        "osascript -e 'output volume of (get volume settings)'",
      );
      const { stdout: mutedOut } = await execAsync(
        "osascript -e 'output muted of (get volume settings)'",
      );
      const vol = parseInt(stdout.trim(), 10) || 50;
      const isMuted = mutedOut.trim() === "true";
      setState((prev) => ({
        ...prev,
        volume: vol,
        muted: isMuted,
      }));
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVolume();
    const interval = setInterval(fetchVolume, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleShowOnNotch = async () => {
    try {
      await startDaemonIfNotRunning();
      await sendSocketCommand({ action: "expand", widget: "mixer" });
      await showToast({
        style: Toast.Style.Success,
        title: "Showing Volume Mixer on Notch",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to expand notch mixer",
      });
    }
  };

  const handleSetVolume = async (newVol: number) => {
    try {
      const clamped = Math.max(0, Math.min(100, newVol));
      await execAsync(`osascript -e 'set volume output volume ${clamped}'`);
      setState((prev) => ({ ...prev, volume: clamped, muted: false }));
      await showToast({
        style: Toast.Style.Success,
        title: `Volume: ${clamped}%`,
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not set volume",
      });
    }
  };

  const handleToggleMute = async () => {
    try {
      const nextMuted = !state.muted;
      await execAsync(
        `osascript -e 'set volume output muted ${nextMuted ? "true" : "false"}'`,
      );
      setState((prev) => ({ ...prev, muted: nextMuted }));
      await showToast({
        style: Toast.Style.Success,
        title: nextMuted ? "Muted" : "Unmuted",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not toggle mute",
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search volume actions...">
      <List.Section title="System Audio Level">
        <List.Item
          icon={{
            source: state.muted ? Icon.SpeakerOff : Icon.SpeakerHigh,
            tintColor: state.muted ? Color.Red : Color.Orange,
          }}
          title="Master System Volume"
          subtitle={`${state.muted ? "Muted" : `${state.volume}%`}`}
          accessories={[
            {
              text: "Show in Dynamic Island",
              icon: Icon.ChevronUp,
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Show Volume Mixer on Notch"
                icon={Icon.Eye}
                onAction={handleShowOnNotch}
              />
              <Action
                title={state.muted ? "Unmute Audio" : "Mute Audio"}
                icon={state.muted ? Icon.SpeakerHigh : Icon.SpeakerOff}
                onAction={handleToggleMute}
              />
              <Action
                title="Increase Volume (+10%)"
                icon={Icon.Plus}
                onAction={() => handleSetVolume(state.volume + 10)}
              />
              <Action
                title="Decrease Volume (-10%)"
                icon={Icon.Minus}
                onAction={() => handleSetVolume(state.volume - 10)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Quick Preset Levels">
        {[100, 75, 50, 25, 0].map((preset) => (
          <List.Item
            key={preset}
            icon={{
              source: preset === 0 ? Icon.SpeakerOff : Icon.SpeakerHigh,
              tintColor: Color.Orange,
            }}
            title={`Set Volume to ${preset}%`}
            actions={
              <ActionPanel>
                <Action
                  title={`Set to ${preset}%`}
                  icon={Icon.Check}
                  onAction={() => handleSetVolume(preset)}
                />
                <Action
                  title="Show Volume Mixer on Notch"
                  icon={Icon.Eye}
                  onAction={handleShowOnNotch}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
