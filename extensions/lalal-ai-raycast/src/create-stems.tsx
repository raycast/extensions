import {
  showToast,
  Toast,
  getSelectedFinderItems,
  LaunchProps,
  open,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { LalalAI } from "./lib/lalal-ai";
import { getPreferenceValues } from "@raycast/api";
import { TaskHistory } from "./lib/task-history";
import { UserPreferences } from "./lib/user-preferences";
import * as path from "path";

export default async function Command(
  props: LaunchProps<{
    arguments: {
      stemType: string;
    };
  }>,
) {
  try {
    // Get selected file from Finder
    const selectedItems = await getSelectedFinderItems();
    if (selectedItems.length === 0) {
      return;
    }

    const selectedFile = selectedItems[0].path;

    // Validate file type - Lalal.ai API supported formats
    const supportedExtensions = [
      // Audio formats
      ".mp3",
      ".ogg",
      ".wav",
      ".flac",
      ".aiff",
      ".aac",
      ".m4a",
      // Video formats
      ".avi",
      ".mp4",
      ".mkv",
      ".mov",
      ".webm",
    ];

    const fileExtension = path.extname(selectedFile).toLowerCase();
    if (!supportedExtensions.includes(fileExtension)) {
      return;
    }

    const userPrefs = new UserPreferences();

    // Get stem type - use provided argument, fallback to last used, then default to vocals
    let { stemType } = props.arguments;
    if (!stemType || stemType === "") {
      stemType = await userPrefs.getLastUsedStemType();
    }

    // Final fallback to vocals if still empty
    if (!stemType || stemType === "") {
      stemType = "vocals";
    }

    // Save the stem type for next time (only if it's valid)
    if (stemType && stemType !== "") {
      await userPrefs.setLastUsedStemType(stemType);
    }

    // Show user what stem type is being used
    const stemTypeDisplay =
      stemType === "vocals"
        ? "Vocal and Instrumental"
        : stemType === "drum"
          ? "Drums"
          : stemType === "piano"
            ? "Piano"
            : stemType === "bass"
              ? "Bass"
              : stemType === "voice"
                ? "Voice/Noise"
                : stemType === "electric_guitar"
                  ? "Electric Guitar"
                  : stemType === "acoustic_guitar"
                    ? "Acoustic Guitar"
                    : stemType === "synthesizer"
                      ? "Synthesizer"
                      : stemType === "strings"
                        ? "Strings"
                        : stemType === "wind"
                          ? "Wind"
                          : stemType;

    // Check if license key is set
    const preferences = getPreferenceValues<{ license: string }>();
    if (!preferences.license) {
      return;
    }

    const lalalAI = new LalalAI(preferences.license);
    const filename = path.basename(selectedFile);
    const fileDir = path.dirname(selectedFile);

    await showToast({
      style: Toast.Style.Animated,
      title: "Uploading file...",
      message: `Processing: ${filename}`,
    });

    // Upload the file
    const uploadResult = await lalalAI.uploadFile(selectedFile, filename);

    if (uploadResult.status !== "success" || !uploadResult.id) {
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Processing stems...",
      message: `Separating ${stemTypeDisplay} from ${filename}`,
    });

    // Split the audio
    const splitParams = {
      id: uploadResult.id,
      stem: stemType,
      splitter: "phoenix" as const, // Lalal.ai default splitter
      enhanced_processing_enabled: false, // Lalal.ai default
      noise_cancelling_level: 0, // Lalal.ai default
      dereverb_enabled: false, // Lalal.ai default
    };

    const splitResult = await lalalAI.splitAudio([splitParams]);

    if (splitResult.status !== "success") {
      return;
    }

    // Store in task history
    const taskHistory = new TaskHistory();
    await taskHistory.addTask({
      id: uploadResult.id,
      taskId: splitResult.task_id || "",
      fileName: filename,
      stemType: stemType,
      status: "processing",
      submittedAt: new Date().toISOString(),
    });

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

      console.log(
        `Polling attempt ${attempts}/${maxAttempts} for file ID: ${uploadResult.id}`,
      );
      const statusResult = await lalalAI.checkTaskStatus([uploadResult.id]);

      if (statusResult.status === "success" && statusResult.result) {
        const taskData = statusResult.result[uploadResult.id];

        if (taskData?.task?.state === "success" && taskData.split) {
          // Download the results
          const baseName = path.parse(filename).name;
          const stemPath = path.join(fileDir, `${baseName}_${stemType}.mp3`);
          const backTrackPath = path.join(fileDir, `${baseName}_backtrack.mp3`);

          await lalalAI.downloadFile(taskData.split.stem_track, stemPath);
          await lalalAI.downloadFile(taskData.split.back_track, backTrackPath);

          // Update task history
          await taskHistory.updateTask(uploadResult.id, {
            status: "complete",
            completedAt: new Date().toISOString(),
            resultUrls: {
              stemTrack: taskData.split.stem_track,
              backTrack: taskData.split.back_track,
            },
          });

          // Open Finder and select the created files
          await open(fileDir, "Finder");

          // Select the newly created stem files in Finder
          try {
            await runAppleScript(`
              tell application "Finder"
                activate
                set targetFolder to POSIX file "${fileDir}" as alias
                open targetFolder
                set stemFile to POSIX file "${stemPath}" as alias
                set backTrackFile to POSIX file "${backTrackPath}" as alias
                select {stemFile, backTrackFile}
              end tell
            `);
          } catch (error) {
            // If AppleScript fails, just continue - Finder is already open
            console.log("Could not select files in Finder:", error);
          }

          // await showToast({
          //   style: Toast.Style.Success,
          //   title: "Stems created successfully!",
          //   message: `Files saved to ${fileDir}`,
          // });

          return;
        } else if (taskData?.task?.state === "error") {
          return;
        }
      }
    }

    // Timeout - process took too long
  } catch (error) {
    // Error occurred during processing
  }
}
