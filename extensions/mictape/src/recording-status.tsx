import { getPreferenceValues, Icon, launchCommand, LaunchType, MenuBarExtra, open, showHUD } from "@raycast/api";
import { dirname } from "node:path";
import { showError } from "./lib/errors";
import { elapsedSince, fileName, formatClock, getStatusSync, Status, stopRecording } from "./lib/mictape";

/** Status is read synchronously: an async read would render a "not recording" frame first and make the item flicker. */
function readStatus(): { status?: Status; error?: unknown } {
  try {
    return { status: getStatusSync() };
  } catch (error) {
    return { error };
  }
}

export default function Command() {
  const { hideWhenIdle } = getPreferenceValues<Preferences.RecordingStatus>();
  const { status, error } = readStatus();

  if (!status?.recording) {
    if (hideWhenIdle && !error) return null;
    return (
      <MenuBarExtra
        icon={Icon.Microphone}
        tooltip={error ? "MicTape: mictape is not available" : "MicTape: not recording"}
      >
        <MenuBarExtra.Item
          title="Start Recording…"
          icon={Icon.Microphone}
          onAction={() => launchCommand({ name: "start-recording", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra>
    );
  }

  const path = status.path ?? "";
  return (
    <MenuBarExtra
      icon={{ source: Icon.CircleFilled, tintColor: "#ff3b30" }}
      title={formatClock(elapsedSince(status.startedAt))}
      tooltip={`MicTape: recording to ${fileName(path)}`}
    >
      <MenuBarExtra.Item title={fileName(path)} subtitle={status.device} />
      <MenuBarExtra.Item
        title="Stop Recording"
        icon={Icon.Stop}
        onAction={async () => {
          try {
            const saved = await stopRecording();
            await showHUD(`Saved ${fileName(saved.path)} (${formatClock(saved.duration)})`);
          } catch (e) {
            await showError("Could not stop recording", e);
          }
          await launchCommand({ name: "recording-status", type: LaunchType.Background });
        }}
      />
      <MenuBarExtra.Item title="Show in Finder" icon={Icon.Finder} onAction={() => open(dirname(path))} />
    </MenuBarExtra>
  );
}
