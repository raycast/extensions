import { Action, ActionPanel, Color, Form, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { NotInstalledView } from "./components/NotInstalledView";
import {
  CONSORT_WEBSITE_URL,
  delay,
  formatActiveSourceSummary,
  formatBalance,
  formatDelay,
  formatTransportLabel,
  readConsortState,
  runConsortAction,
} from "./lib/consort";

const VOLUME_PRESETS = [15, 25, 40, 50, 65, 80, 100];

function CustomVolumeForm({ currentVolume, onApplied }: { currentVolume: number; onApplied: () => Promise<void> }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ volume: string }>({
    initialValues: { volume: String(currentVolume) },
    validation: {
      volume: (value) => {
        const trimmed = value?.trim() ?? "";
        if (!trimmed) {
          return "Volume is required.";
        }
        const parsed = Number.parseFloat(trimmed);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
          return "Enter a number between 0 and 100.";
        }
      },
    },
    async onSubmit(values) {
      const clamped = Math.round(Number.parseFloat(values.volume.trim()));
      const ok = await runConsortAction(`volume?set=${clamped}`, { toastTitle: `Volume set to ${clamped}%` });
      if (!ok) {
        return;
      }
      await onApplied();
      pop();
    },
  });

  return (
    <Form
      navigationTitle="Set Consort Volume"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Volume" icon={Icon.SpeakerOn} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Volume (%)" placeholder="0 to 100" {...itemProps.volume} />
    </Form>
  );
}

function CustomDelayForm({ currentDelayMs, onApplied }: { currentDelayMs: number; onApplied: () => Promise<void> }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ delayMs: string }>({
    initialValues: { delayMs: String(Math.round(currentDelayMs * 10) / 10) },
    validation: {
      delayMs: (value) => {
        const trimmed = value?.trim().replace(",", ".") ?? "";
        if (!trimmed) {
          return "Delay is required.";
        }
        const parsed = Number.parseFloat(trimmed);
        if (!Number.isFinite(parsed) || parsed < -2500 || parsed > 2500) {
          return "Enter a delay between -2500 and +2500 ms.";
        }
      },
    },
    async onSubmit(values) {
      const parsed = Number.parseFloat(values.delayMs.trim().replace(",", "."));
      const rounded = Math.round(parsed * 10) / 10;
      const ok = await runConsortAction(`delay?set=${rounded}`, {
        toastTitle: `Inter-speaker delay set to ${formatDelay(rounded)}`,
      });
      if (!ok) {
        return;
      }
      await onApplied();
      pop();
    },
  });

  return (
    <Form
      navigationTitle="Set Inter-Speaker Delay"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Delay" icon={Icon.Clock} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Delay (ms)"
        placeholder="-2500 to +2500"
        info="Positive values delay the Left speaker; negative values delay the Right speaker."
        {...itemProps.delayMs}
      />
    </Form>
  );
}

export default function ControlConsortCommand() {
  const { data: state, error, isLoading, revalidate } = usePromise(readConsortState);

  if (!isLoading && state && !state.installed) {
    return <NotInstalledView />;
  }

  if (error && !state) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Control Consort stereo pair, volume, and audio sources...">
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to Read Consort State"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  async function triggerAndRefresh(commandPath: string, toastTitle: string) {
    const ok = await runConsortAction(commandPath, { toastTitle });
    if (ok) {
      await delay(250);
      await revalidate();
    }
  }

  const leftName = state?.leftSpeaker?.displayName ?? "Unassigned";
  const rightName = state?.rightSpeaker?.displayName ?? "Unassigned";
  const pairSubtitle =
    state?.leftSpeaker || state?.rightSpeaker ? `L: ${leftName} · R: ${rightName}` : "No speakers assigned";

  const statusTag = !state
    ? { value: "Loading", color: Color.SecondaryText }
    : !state.running
      ? { value: "Not Running", color: Color.SecondaryText }
      : state.wasStreaming
        ? { value: "Active", color: Color.Green }
        : { value: "Ready", color: Color.Blue };

  const activeSourceLabel = state ? formatActiveSourceSummary(state) : "Loading";

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Control Consort stereo pair, volume, and audio sources...">
      <List.Section title="Stereo Pair" subtitle={pairSubtitle}>
        <List.Item
          icon={{ source: Icon.Play, tintColor: state?.running ? Color.Green : Color.SecondaryText }}
          title="Toggle Stereo Stream"
          subtitle={pairSubtitle}
          accessories={[{ tag: statusTag }]}
          actions={
            <ActionPanel>
              <Action
                title="Toggle Stereo Stream"
                icon={Icon.Play}
                onAction={() => triggerAndRefresh("toggle", "Toggled stereo stream")}
              />
              <Action
                title="Start Stereo Stream"
                icon={Icon.PlayFilled}
                onAction={() => triggerAndRefresh("start", "Started stereo stream")}
              />
              <Action
                title="Stop Stereo Stream"
                icon={Icon.Stop}
                shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
                onAction={() => triggerAndRefresh("stop", "Stopped stereo stream")}
              />
              <Action
                title="Refresh Status"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
              <ActionPanel.Section>
                <Action
                  title="Open Consort Settings"
                  icon={Icon.Gear}
                  onAction={() => triggerAndRefresh("settings", "Opened Consort Settings")}
                />
                <Action.OpenInBrowser title="Visit Consort Website" url={CONSORT_WEBSITE_URL} icon={Icon.Globe} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />

        <List.Item
          icon={Icon.Switch}
          title="Swap Left and Right Speakers"
          subtitle={
            state?.leftSpeaker && state?.rightSpeaker
              ? `${state.leftSpeaker.displayName} (${formatTransportLabel(state.leftSpeaker.transportKind)}) <-> ${state.rightSpeaker.displayName} (${formatTransportLabel(state.rightSpeaker.transportKind)})`
              : "Exchange active Left and Right channels"
          }
          actions={
            <ActionPanel>
              <Action
                title="Swap Left and Right Speakers"
                icon={Icon.Switch}
                onAction={() => triggerAndRefresh("swap", "Swapped Left and Right speakers")}
              />
              <Action
                title="Test Left Speaker"
                icon={Icon.SpeakerUp}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                onAction={() => triggerAndRefresh("test-left", "Testing Left speaker")}
              />
              <Action
                title="Test Right Speaker"
                icon={Icon.SpeakerUp}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={() => triggerAndRefresh("test-right", "Testing Right speaker")}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={Icon.Microphone}
          title="Sync Audio"
          subtitle="Align speaker latency with 1-click microphone calibration"
          accessories={[{ text: state ? formatDelay(state.delayMs) : "0 ms" }]}
          actions={
            <ActionPanel>
              <Action
                title="Run Acoustic Sync"
                icon={Icon.Microphone}
                onAction={() => triggerAndRefresh("calibrate", "Started 1-click acoustic sync")}
              />
              <Action.Push
                title="Set Custom Delay…"
                icon={Icon.Clock}
                shortcut={{ modifiers: ["cmd", "opt"], key: "d" }}
                target={
                  <CustomDelayForm
                    currentDelayMs={state?.delayMs ?? 0}
                    onApplied={async () => {
                      await delay(250);
                      await revalidate();
                    }}
                  />
                }
              />
              <Action
                title="Reset Delay to Zero"
                icon={Icon.ArrowCounterClockwise}
                onAction={() => triggerAndRefresh("delay?set=0", "Reset inter-speaker delay to 0 ms")}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={Icon.SpeakerHigh}
          title="Test Stereo Channels"
          subtitle="Play a soft calibration chime on the Left or Right speaker"
          actions={
            <ActionPanel>
              <Action
                title="Test Left Speaker"
                icon={Icon.SpeakerUp}
                onAction={() => triggerAndRefresh("test-left", "Testing Left speaker")}
              />
              <Action
                title="Test Right Speaker"
                icon={Icon.SpeakerUp}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={() => triggerAndRefresh("test-right", "Testing Right speaker")}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Volume & Balance">
        <List.Item
          icon={Icon.SpeakerOn}
          title="Master Volume"
          subtitle="Adjust Consort stereo volume or jump to a preset"
          accessories={[{ tag: { value: state ? `${state.volumePercent}%` : "50%", color: Color.PrimaryText } }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Set Custom Volume…"
                icon={Icon.Pencil}
                target={
                  <CustomVolumeForm
                    currentVolume={state?.volumePercent ?? 50}
                    onApplied={async () => {
                      await delay(250);
                      await revalidate();
                    }}
                  />
                }
              />
              <Action
                title="Increase Volume"
                icon={Icon.SpeakerUp}
                shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                onAction={() => triggerAndRefresh("volume-up", "Increased volume")}
              />
              <Action
                title="Decrease Volume"
                icon={Icon.SpeakerDown}
                shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                onAction={() => triggerAndRefresh("volume-down", "Decreased volume")}
              />
              <Action
                title="Toggle Mute"
                icon={Icon.SpeakerOff}
                shortcut={{ modifiers: ["cmd"], key: "m" }}
                onAction={() => triggerAndRefresh("toggle-mute", "Toggled mute")}
              />
              <ActionPanel.Submenu title="Set Volume Preset" icon={Icon.Gauge}>
                {VOLUME_PRESETS.map((preset) => (
                  <Action
                    key={preset}
                    title={`${preset}%`}
                    onAction={() => triggerAndRefresh(`volume?set=${preset}`, `Volume set to ${preset}%`)}
                  />
                ))}
              </ActionPanel.Submenu>
            </ActionPanel>
          }
        />

        <List.Item
          icon={Icon.Gauge}
          title="Stereo Balance"
          subtitle="Equal-power Left/Right channel balance"
          accessories={[{ text: state ? formatBalance(state.balance) : "Centered" }]}
          actions={
            <ActionPanel>
              <Action
                title="Center Balance"
                icon={Icon.Dot}
                onAction={() => triggerAndRefresh("balance?set=center", "Centered stereo balance")}
              />
              <Action
                title="Shift Balance Left (-20%)"
                icon={Icon.ArrowLeft}
                onAction={() => triggerAndRefresh("balance?set=-20", "Shifted balance Left 20%")}
              />
              <Action
                title="Shift Balance Right (+20%)"
                icon={Icon.ArrowRight}
                onAction={() => triggerAndRefresh("balance?set=20", "Shifted balance Right 20%")}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Audio Source" subtitle={activeSourceLabel}>
        <List.Item
          icon={Icon.Desktop}
          title="All Mac Audio"
          subtitle="Route all system output to your stereo pair"
          accessories={
            state?.routingMode === "all" ? [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green } }] : []
          }
          actions={
            <ActionPanel>
              <Action
                title="Route All Mac Audio"
                icon={Icon.Desktop}
                onAction={() => triggerAndRefresh("source?mode=all", "Audio source set to All Mac Audio")}
              />
            </ActionPanel>
          }
        />

        {(state?.savedApps ?? []).map((app) => {
          const isSelected = state?.routingMode === "selected" && state.selectedBundleIDs.includes(app.bundleID);
          return (
            <List.Item
              key={app.bundleID}
              icon={app.bundlePath ? { fileIcon: app.bundlePath } : Icon.AppWindow}
              title={app.displayName}
              subtitle={app.bundleID}
              accessories={isSelected ? [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green } }] : []}
              actions={
                <ActionPanel>
                  <Action
                    title={`Route ${app.displayName}`}
                    icon={Icon.Music}
                    onAction={() =>
                      triggerAndRefresh(
                        `source?app=${encodeURIComponent(app.bundleID)}`,
                        `Audio source set to ${app.displayName}`
                      )
                    }
                  />
                  <Action.CopyToClipboard title="Copy Bundle ID" content={app.bundleID} icon={Icon.Clipboard} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
