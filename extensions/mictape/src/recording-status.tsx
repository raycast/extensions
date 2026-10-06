import { getPreferenceValues, Icon, launchCommand, LaunchType, MenuBarExtra, open, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { dirname } from "node:path";
import { showError } from "./lib/errors";
import { elapsedSince, fileName, formatClock, getStatus, stopRecording } from "./lib/mictape";

export default function Command() {
  const { hideWhenIdle } = getPreferenceValues<Preferences.RecordingStatus>();
  const {
    data: status,
    isLoading,
    revalidate,
  } = usePromise(getStatus, [], {
    onError: () => undefined,
  });

  if (!status?.recording) {
    if (hideWhenIdle && !isLoading) return null;
    return (
      <MenuBarExtra icon={Icon.Microphone} tooltip="MicTape: not recording" isLoading={isLoading}>
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
      isLoading={isLoading}
    >
      <MenuBarExtra.Item title={fileName(path)} subtitle={status.device} />
      <MenuBarExtra.Item
        title="Stop Recording"
        icon={Icon.Stop}
        onAction={async () => {
          try {
            const saved = await stopRecording();
            await showHUD(`Saved ${fileName(saved.path)} (${formatClock(saved.duration)})`);
          } catch (error) {
            await showError("Could not stop recording", error);
          }
          revalidate();
        }}
      />
      <MenuBarExtra.Item title="Show in Finder" icon={Icon.Finder} onAction={() => open(dirname(path))} />
    </MenuBarExtra>
  );
}
