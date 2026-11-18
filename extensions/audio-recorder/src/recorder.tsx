import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  environment,
  confirmAlert,
  Form,
  Icon,
  List,
  open,
  openExtensionPreferences,
  showToast,
  trash,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import path from "node:path";
import { usePromise, showFailureToast } from "@raycast/utils";
import { control, duration, idle, knownFolders, Mode, modes, preferences, readStatus } from "./bridge";
import { waveformImage } from "./waveform";
import { listRecordings, Recording, renameRecording } from "./files";

function RenameForm({ recording, refresh }: { recording: Recording; refresh: Refresh }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(path.basename(recording.name, path.extname(recording.name)));
  return (
    <Form
      navigationTitle="Rename Recording"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename Recording"
            onSubmit={async () => {
              try {
                await renameRecording(recording.path, name);
                await refresh();
                pop();
              } catch (error) {
                await showFailureToast(error, { title: "Could Not Rename Recording" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Weekly Meeting"
        value={name}
        onChange={setName}
        autoFocus
        info={`The ${path.extname(recording.name)} extension is kept automatically.`}
      />
    </Form>
  );
}

type Refresh = () => void | Promise<unknown>;

async function readRecordings() {
  return listRecordings(await knownFolders());
}

function useRecorderStatus(waveform = false) {
  const query = usePromise(readStatus, [], { failureToastOptions: { title: "Could Not Read Recorder Status" } });
  const { revalidate } = query;
  const interval = waveform && query.data?.state === "recording" ? 200 : 1000;
  useEffect(() => {
    const timer = setInterval(() => void revalidate(), interval);
    return () => clearInterval(timer);
  }, [revalidate, interval]);
  return query;
}

function useRecordingControl(refreshStatus: Refresh, refreshFiles: Refresh, mode?: Mode) {
  const [busy, setBusy] = useState(false);
  const act = useCallback(
    async (action: string) => {
      setBusy(true);
      try {
        await control(action, mode);
        await Promise.all([refreshStatus(), refreshFiles()]);
        if (action === "stop" || action === "recover") {
          await showToast({ title: "Saving Recording", message: "The menu bar shows when saving finishes." });
        }
      } catch (error) {
        await showFailureToast(error, { title: "Audio Recorder" });
      } finally {
        setBusy(false);
      }
    },
    [mode, refreshStatus, refreshFiles],
  );
  return { busy, act };
}

function CommonActions({ refreshFiles }: { refreshFiles: Refresh }) {
  return (
    <>
      <Action
        title="Refresh Recordings"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refreshFiles}
      />
      <Action
        title="Open Output Folder"
        icon={Icon.Folder}
        onAction={async () => {
          try {
            await open(preferences().outputFolder);
          } catch (error) {
            await showFailureToast(error, { title: "Could Not Open Folder" });
          }
        }}
      />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </>
  );
}

function WaveformView({ refreshFiles }: { refreshFiles: Refresh }) {
  const { pop } = useNavigation();
  const query = useRecorderStatus(true);
  const status = query.data || idle;
  const { busy, act } = useRecordingControl(query.revalidate, refreshFiles);
  const capturing = status.state === "recording";
  const active = capturing || status.state === "paused";
  useEffect(() => {
    if (query.data && !active && status.state !== "starting") pop();
  }, [query.data, active, status.state, pop]);
  useEffect(() => {
    if (!capturing) return;
    // Telemetry is a best-effort subscription, not a recording control action.
    const subscribe = () => void control("monitor").catch(() => undefined);
    subscribe();
    const timer = setInterval(subscribe, 4000);
    return () => clearInterval(timer);
  }, [capturing]);
  const image = waveformImage(status, environment.appearance === "dark");
  return (
    <Detail
      navigationTitle="Recording"
      isLoading={busy || (query.isLoading && !query.data)}
      markdown={`![Captured audio waveform, ${duration(status.duration)}, ${status.state}](${image})\n\nMicrophone: **${status.microphoneName || "Off"}** · ${status.format.toUpperCase()}\n\n${status.warning || "Close Raycast normally. Recording continues in the background."}`}
      actions={
        <ActionPanel>
          {active && (
            <Action
              title={status.state === "paused" ? "Resume Recording" : "Pause Recording"}
              icon={status.state === "paused" ? Icon.Play : Icon.Pause}
              onAction={() => act(status.state === "paused" ? "resume" : "pause")}
            />
          )}
          {active && (
            <Action
              title="Stop and Save Recording"
              icon={Icon.Stop}
              shortcut={Keyboard.Shortcut.Common.Save}
              onAction={() => act("stop")}
            />
          )}
          <Action
            title="Back to Recordings"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={pop}
          />
          <ActionPanel.Section>
            <CommonActions refreshFiles={refreshFiles} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Recorder() {
  const statusQuery = useRecorderStatus();
  const status = statusQuery.data || idle;
  const [mode, setMode] = useState<Mode>(preferences().mode);
  const filesQuery = usePromise(readRecordings, [], { failureToastOptions: { title: "Could Not Load Recordings" } });
  const recordings = filesQuery.data || [];
  const refreshFiles = filesQuery.revalidate;
  const { busy, act } = useRecordingControl(statusQuery.revalidate, refreshFiles, mode);
  const folderError = filesQuery.error?.message || statusQuery.error?.message;
  const loading = (filesQuery.isLoading && !filesQuery.data) || (statusQuery.isLoading && !statusQuery.data);
  useEffect(() => {
    const timer = setInterval(() => void refreshFiles(), 5000);
    return () => clearInterval(timer);
  }, [refreshFiles]);
  const active = ["recording", "paused"].includes(status.state);
  const waiting = busy || ["starting", "finalizing"].includes(status.state);
  const statusTitles = {
    idle: "Ready to Record",
    starting: "Starting Recording…",
    recording: "Recording",
    paused: "Recording Paused",
    finalizing: "Saving Recording…",
    error: "Recording Needs Attention",
  };
  const commonActions = <CommonActions refreshFiles={refreshFiles} />;
  return (
    <List
      isLoading={loading || busy}
      searchBarPlaceholder="Search recordings…"
      searchBarAccessory={
        <List.Dropdown tooltip="Recording Mode" value={mode} onChange={(value) => setMode(value as Mode)}>
          {modes.map((item) => (
            <List.Dropdown.Item key={item.value} value={item.value} title={item.title} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section
        title="Recorder"
        subtitle={
          active
            ? modes.find((item) => item.value === status.mode)?.title
            : modes.find((item) => item.value === mode)?.title
        }
      >
        <List.Item
          id="status"
          title={statusTitles[status.state]}
          subtitle={active ? duration(status.duration) : preferences().format.toUpperCase()}
          icon={{
            source: active ? (status.state === "paused" ? Icon.Pause : Icon.CircleFilled) : Icon.Microphone,
            tintColor: active ? Color.Red : Color.PrimaryText,
          }}
          accessories={active ? [{ tag: { value: duration(status.duration), color: Color.Red } }] : []}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {!active && !waiting && !status.recoveryAvailable && (
                  <Action title="Start Recording" icon={Icon.CircleFilled} onAction={() => act("start")} />
                )}
                {status.state === "recording" && (
                  <Action title="Pause Recording" icon={Icon.Pause} onAction={() => act("pause")} />
                )}
                {status.state === "paused" && (
                  <Action title="Resume Recording" icon={Icon.Play} onAction={() => act("resume")} />
                )}
                {active && (
                  <Action
                    title="Stop and Save Recording"
                    icon={Icon.Stop}
                    shortcut={Keyboard.Shortcut.Common.Save}
                    onAction={() => act("stop")}
                  />
                )}
                {active && (
                  <Action.Push
                    title="Show Waveform"
                    icon={Icon.Waveform}
                    shortcut={Keyboard.Shortcut.Common.Open}
                    target={<WaveformView refreshFiles={refreshFiles} />}
                  />
                )}
                {status.recoveryAvailable && (
                  <Action
                    title="Recover Interrupted Recording"
                    icon={Icon.ArrowClockwise}
                    onAction={() => act("recover")}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section>{commonActions}</ActionPanel.Section>
              <ActionPanel.Section title="Permissions">
                <Action
                  title="Open Microphone Permissions"
                  icon={Icon.Microphone}
                  onAction={() => open("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")}
                />
                <Action
                  title="Open System Audio Permissions"
                  icon={Icon.Speaker}
                  onAction={() => open("x-apple.systempreferences:com.apple.preference.security?Privacy_AudioCapture")}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
        {active && status.mode !== "system" && (
          <List.Item
            title="Microphone"
            subtitle={status.microphoneName || "Starting…"}
            accessories={[
              {
                text:
                  (status.microphonePeak || 0) > 0
                    ? `${Math.round(20 * Math.log10(status.microphonePeak!))} dB`
                    : "No signal",
              },
            ]}
            icon={Icon.Microphone}
            actions={<ActionPanel>{commonActions}</ActionPanel>}
          />
        )}
        {active && status.mode !== "microphone" && (
          <List.Item
            title="System Audio"
            subtitle="Audio playing on your Mac"
            accessories={[
              {
                text:
                  (status.systemPeak || 0) > 0 ? `${Math.round(20 * Math.log10(status.systemPeak!))} dB` : "No signal",
              },
            ]}
            icon={Icon.Speaker}
            actions={<ActionPanel>{commonActions}</ActionPanel>}
          />
        )}
        {status.warning && (
          <List.Item
            title={status.warning}
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
            actions={<ActionPanel>{commonActions}</ActionPanel>}
          />
        )}
        {(status.error || folderError) && (
          <List.Item
            title={status.error || folderError || ""}
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
            actions={<ActionPanel>{commonActions}</ActionPanel>}
          />
        )}
      </List.Section>
      <List.Section title="Recordings" subtitle={`${recordings.length} saved`}>
        {recordings.length === 0 && (
          <List.Item
            title="No Recordings Yet"
            subtitle="Select Ready to Record and press Return to start"
            icon={Icon.Waveform}
            actions={<ActionPanel>{commonActions}</ActionPanel>}
          />
        )}
        {recordings.map((recording) => (
          <List.Item
            key={recording.path}
            title={recording.name}
            icon={Icon.Music}
            subtitle={recording.created.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
            accessories={[{ text: `${(recording.size / 1024 / 1024).toFixed(1)} MB` }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Open title="Play Recording" target={recording.path} icon={Icon.Play} />
                  <Action.ShowInFinder path={recording.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
                  <Action.Push
                    title="Rename Recording"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={<RenameForm recording={recording} refresh={refreshFiles} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy Recording"
                    content={{ file: recording.path }}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.CopyToClipboard
                    title="Copy File Path"
                    content={recording.path}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>{commonActions}</ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Move Recording to Trash"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Move Recording to Trash?",
                          message: recording.name,
                          primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        try {
                          await trash(recording.path);
                          await refreshFiles();
                        } catch (error) {
                          await showFailureToast(error, { title: "Could Not Delete Recording" });
                        }
                      }
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
