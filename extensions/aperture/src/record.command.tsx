import { useRef } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Icon,
  List,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  open,
  popToRoot,
  showToast,
  updateCommandMetadata,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import { dirname } from "path";
import { Aperture } from "~/api/aperture";
import { Recording } from "~/types/recording";
import { moveFileToSaveLocation } from "~/utils/fs";
import { killRecordingIndicator, launchRecordingIndicator } from "~/utils/indicator";
import {
  clearStoredRecording,
  getStoredRecording,
  getStoredRecordingPreferences,
  saveRecordingData,
} from "~/utils/storage";

const { postSaveAction, copyToClipboard } = getPreferenceValues<Preferences>();

const RecordingMode = {
  EntireScreen: "entire-screen",
} as const;

type RecordingMode = (typeof RecordingMode)[keyof typeof RecordingMode];

export default function RecordCommand() {
  const selectedRecordingMode = useRef<RecordingMode>(RecordingMode.EntireScreen);
  const { isRecording, isLoading } = useStopOnGoingRecording();

  const handleStartRecording = async () => {
    const toast = await showToast({ title: "Starting recording...", style: Toast.Style.Animated });
    try {
      const recordingOptions = await getStoredRecordingPreferences();
      if (selectedRecordingMode.current === RecordingMode.EntireScreen) {
        const recording = await new Aperture().startRecording(recordingOptions);
        await saveRecordingData(recording);
        await launchRecordingIndicator();

        toast.style = Toast.Style.Success;
        toast.title = "Recording started";
        await updateCommandMetadata({ subtitle: "🔴 Recording" });
        await popToRoot();
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not start recording";
      if (environment.isDevelopment) console.error("Could not start recording", error);
    }
  };

  const handleSelectionChange = (id: string | null) => {
    selectedRecordingMode.current = id as RecordingMode;
  };

  if (isLoading) return <List isLoading />;

  return (
    <List onSelectionChange={handleSelectionChange}>
      {!isRecording ? (
        <List.Item
          id={RecordingMode.EntireScreen}
          title="Capture Entire Screen"
          icon={Icon.Maximize}
          actions={
            <ActionPanel>
              <Action title="Start Recording" onAction={handleStartRecording} icon={Icon.Camera} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          title="You are recording"
          description="Please stop you current recording before starting a new one."
          icon={Icon.Video}
        />
      )}
    </List>
  );
}

async function stopRecording(recording: Recording) {
  const elapsedString = formatDistanceToNow(recording.startTime, { includeSeconds: true, addSuffix: true });
  const hasConfirmedAction = await confirmAlert({
    title: "Stop Recording",
    message: `You started recording ${elapsedString}.\nDo you wish to stop it?`,
    primaryAction: {
      title: "Stop Recording",
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!hasConfirmedAction) return;

  const toast = await showToast({ title: "Saving recording...", style: Toast.Style.Animated });
  const { endTime } = await new Aperture(recording).stopRecording();
  await killRecordingIndicator();

  const savedFilePath = await moveFileToSaveLocation(recording.filePath, endTime);
  if (postSaveAction === "open") await open(savedFilePath);
  if (postSaveAction === "openFinder") await open(dirname(savedFilePath), "com.apple.Finder");
  if (copyToClipboard) await Clipboard.copy({ file: savedFilePath });
  await clearStoredRecording();
  await updateCommandMetadata({ subtitle: undefined });

  toast.style = Toast.Style.Success;
  toast.title = "Recording saved";
  await popToRoot();
}

function useStopOnGoingRecording() {
  const { data, isLoading } = usePromise(async (): Promise<boolean> => {
    const recording = await getStoredRecording();
    if (!recording || !recording.pid || Number.isNaN(recording.pid)) return false;

    void stopRecording(recording);
    return true;
  });

  return { isRecording: data, isLoading };
}
