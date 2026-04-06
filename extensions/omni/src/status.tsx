import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  formatDuration,
  getErrorMessage,
  omni,
  type DaemonResponse,
  type InputShowResponse,
  type TranscribeStatusResponse,
} from "./lib/omni";

interface StatusData {
  daemon: DaemonResponse | null;
  transcribe: TranscribeStatusResponse | null;
  input: InputShowResponse | null;
  config: Record<string, unknown> | null;
  error: string | null;
}

async function fetchStatus(): Promise<StatusData> {
  const [daemon, transcribe, input, config] = await Promise.allSettled([
    omni<DaemonResponse>(["status"]),
    omni<TranscribeStatusResponse>(["transcribe", "status"]),
    omni<InputShowResponse>(["input", "show"]),
    omni<Record<string, unknown>>(["config", "show"]),
  ]);

  const errorMessages = [daemon, transcribe, input, config]
    .filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    )
    .map((result) => getErrorMessage(result.reason));

  return {
    daemon: daemon.status === "fulfilled" ? daemon.value : null,
    transcribe: transcribe.status === "fulfilled" ? transcribe.value : null,
    input: input.status === "fulfilled" ? input.value : null,
    config: config.status === "fulfilled" ? config.value : null,
    error: errorMessages.length > 0 ? errorMessages[0] : null,
  };
}

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(fetchStatus, [], {
    keepPreviousData: true,
  });

  const daemon = data?.daemon ?? null;
  const transcribe = data?.transcribe ?? null;
  const input = data?.input ?? null;
  const config = data?.config ?? null;
  const fetchError = data?.error;

  const daemonRunning = daemon?.running ?? false;
  const recording = transcribe?.recording ?? false;
  const durationMs = transcribe?.duration_ms ?? 0;

  const serverConfig = config?.server as Record<string, unknown> | undefined;
  const baseUrl = serverConfig?.baseUrl as string | undefined;
  const model = serverConfig?.model as string | undefined;

  const runAction = async (title: string, args: string[]) => {
    try {
      await omni(args);
      await revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title,
        message: getErrorMessage(error),
      });
    }
  };

  const actions = (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={revalidate}
      />
      {daemonRunning && !recording && (
        <Action
          title="Start Transcription"
          icon={Icon.Microphone}
          onAction={() =>
            runAction("Failed to start transcription", [
              "transcribe",
              "start",
              "--background",
            ])
          }
        />
      )}
      {recording && (
        <Action
          title="Stop Transcription"
          icon={Icon.Stop}
          onAction={() =>
            runAction("Failed to stop transcription", ["transcribe", "stop"])
          }
        />
      )}
      {!daemonRunning && (
        <Action
          title="Start Daemon"
          icon={Icon.Play}
          onAction={() => runAction("Failed to start daemon", ["start"])}
        />
      )}
      {daemonRunning && (
        <Action
          title="Stop Daemon"
          icon={Icon.Power}
          style={Action.Style.Destructive}
          onAction={() => runAction("Failed to stop daemon", ["stop"])}
        />
      )}
    </ActionPanel>
  );

  return (
    <List navigationTitle="Omni Status" isLoading={isLoading}>
      {fetchError && (
        <List.Item
          title="Status Error"
          subtitle={fetchError}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          actions={actions}
        />
      )}
      <List.Item
        title="Daemon"
        subtitle={
          daemonRunning ? `Running (pid ${daemon?.pid ?? "?"})` : "Stopped"
        }
        icon={
          daemonRunning
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.XMarkCircle, tintColor: Color.Red }
        }
        actions={actions}
      />
      <List.Item
        title="Recording"
        subtitle={recording ? `Active — ${formatDuration(durationMs)}` : "Idle"}
        icon={
          recording
            ? { source: Icon.Microphone, tintColor: Color.Red }
            : { source: Icon.Stop, tintColor: Color.SecondaryText }
        }
        actions={actions}
      />
      <List.Item
        title="Input Device"
        subtitle={input?.activeDevice ?? "System Default"}
        icon={Icon.SpeakerOn}
        actions={actions}
      />
      <List.Item
        title="Server"
        subtitle={baseUrl ?? "Not configured"}
        icon={Icon.Globe}
        actions={actions}
      />
      <List.Item
        title="Model"
        subtitle={model ?? "Not configured"}
        icon={Icon.ComputerChip}
        actions={actions}
      />
      {transcribe?.transcript_preview && (
        <List.Item
          title="Preview"
          subtitle={transcribe.transcript_preview}
          icon={Icon.Text}
          actions={actions}
        />
      )}
    </List>
  );
}
