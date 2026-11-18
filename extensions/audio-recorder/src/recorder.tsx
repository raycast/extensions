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
  Toast,
  trash,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import path from "node:path";
import { control, duration, idle, knownFolders, Mode, modes, preferences, readStatus, RecorderStatus } from "./bridge";
import { waveformImage } from "./waveform";
import { listRecordings, Recording, renameRecording } from "./files";

function RenameForm({ recording, refresh }: { recording: Recording; refresh: () => Promise<void> }) {
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
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could Not Rename Recording",
                  message: (error as Error).message,
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        value={name}
        onChange={setName}
        autoFocus
        info={`The ${path.extname(recording.name)} extension is kept automatically.`}
      />
    </Form>
  );
}

export default function Recorder() {
  const [status, setStatus] = useState<RecorderStatus>(idle);
  const [mode, setMode] = useState<Mode>(preferences().mode);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [folderError, setFolderError] = useState<string>();
  const [showWaveform, setShowWaveform] = useState(false);
  const capturing = status.state === "recording";
  const refreshFiles = useCallback(async () => {
    try {
      const next = await listRecordings(await knownFolders());
      setRecordings((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
      setFolderError(undefined);
    } catch (error) {
      setFolderError((error as Error).message);
    }
  }, []);
  useEffect(() => {
    let disposed = false;
    const update = async () => {
      const result = await readStatus();
      if (!disposed) {
        setStatus((previous) =>
          previous.state === result.state &&
          Math.floor(previous.duration) === Math.floor(result.duration) &&
          previous.error === result.error &&
          previous.file === result.file &&
          previous.recoveryAvailable === result.recoveryAvailable &&
          previous.mode === result.mode &&
          previous.warning === result.warning &&
          previous.microphoneName === result.microphoneName &&
          !(result.state === "recording" && previous.updatedAt !== result.updatedAt)
            ? previous
            : result,
        );
        setLoading(false);
      }
    };
    void update();
    void refreshFiles();
    const poll = setInterval(
      () => {
        void update();
      },
      capturing && showWaveform ? 200 : 1000,
    );
    const files = setInterval(() => {
      void refreshFiles();
    }, 5000);
    return () => {
      disposed = true;
      clearInterval(poll);
      clearInterval(files);
    };
  }, [refreshFiles, capturing, showWaveform]);
  useEffect(() => {
    if (!capturing || !showWaveform) return;
    const subscribe = () => {
      void control("monitor").catch(() => undefined);
    };
    subscribe();
    const timer = setInterval(subscribe, 4000);
    return () => clearInterval(timer);
  }, [capturing, showWaveform]);
  async function act(action: string) {
    setBusy(true);
    try {
      const result = await control(action, mode);
      setStatus(result);
      if (action === "start") setShowWaveform(false);
      if (action === "stop" || action === "recover")
        await showToast({ title: "Saving Recording", message: "The menu bar shows when saving finishes." });
      await refreshFiles();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Audio Recorder", message: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }
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
  const commonActions = (
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
            await showToast({
              style: Toast.Style.Failure,
              title: "Could Not Open Folder",
              message: (error as Error).message,
            });
          }
        }}
      />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </>
  );
  if (active && showWaveform) {
    const image = waveformImage(status, environment.appearance === "dark");
    return (
      <Detail
        navigationTitle="Audio Recorder"
        isLoading={busy}
        markdown={`![Captured audio waveform, ${duration(status.duration)}, ${status.state}](${image})\n\nMicrophone: **${status.microphoneName || "Off"}** · ${status.format.toUpperCase()}\n\n${status.warning || "Close Raycast normally. Recording continues in the background."}`}
        actions={
          <ActionPanel>
            <Action
              title={status.state === "paused" ? "Resume Recording" : "Pause Recording"}
              icon={status.state === "paused" ? Icon.Play : Icon.Pause}
              onAction={() => act(status.state === "paused" ? "resume" : "pause")}
            />
            <Action
              title="Stop and Save Recording"
              icon={Icon.Stop}
              shortcut={Keyboard.Shortcut.Common.Save}
              onAction={() => act("stop")}
            />
            <Action
              title="Back to Recordings"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() => setShowWaveform(false)}
            />
            <ActionPanel.Section>{commonActions}</ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List
      isLoading={loading || busy}
      searchBarPlaceholder="Search recordings…"
      navigationTitle="Audio Recorder"
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
                  <Action
                    title="Show Waveform"
                    icon={Icon.Waveform}
                    shortcut={Keyboard.Shortcut.Common.Open}
                    onAction={() => setShowWaveform(true)}
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
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Could Not Delete Recording",
                            message: (error as Error).message,
                          });
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
