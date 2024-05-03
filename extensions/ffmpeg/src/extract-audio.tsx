import { Action, ActionPanel, Form, Toast, confirmAlert, showToast } from "@raycast/api";
import { TipForInstallFFmpeg } from "./components/tipForInstallFFmpeg";
import { executeFFmpegCommandAsync, isFFmpegInstalled } from "./utils/ffmpeg";
import { getSelectedVideos } from "./utils/fs";
import { formatTime, getTimeInSeconds } from "./utils/time";
import fs from "fs";

const ffmpegInstalled = isFFmpegInstalled();

export default function ExtractAudio() {
  if (!ffmpegInstalled) {
    return <TipForInstallFFmpeg />;
  }

  const handleSubmit = async (values: { audioFormat: "mp3" | "aac" | "wav" | "flac" }) => {
    const paths = getSelectedVideos();

    if (paths.length === 0) {
      await showToast({ title: "Please select a video file.", style: Toast.Style.Failure });
      return;
    }

    const videoPath = paths[0];
    const { audioFormat } = values;
    const outputPath = `${videoPath.substring(0, videoPath.lastIndexOf("."))}_trim.${audioFormat}`;

    const alreadyExists = fs.existsSync(outputPath);

    if (alreadyExists) {
      const deleteExisting = await confirmAlert({
        title: "File already exists",
        message: "The file already exists. Do you want to replace it?",
      });

      if (deleteExisting) {
        fs.unlinkSync(outputPath);
      } else {
        return;
      }
    }

    await showToast({ title: "Extracting audio...", style: Toast.Style.Animated });

    const command = `-i "/${videoPath}" -vn -acodec ${audioFormat} "${outputPath}"`;

    try {
      const convertingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Extracting...",
      });

      let totalDuration = 0;
      let hasAudio = false;

      await executeFFmpegCommandAsync({
        command: `-i "${videoPath}"`,
        onContent: (data) => {
          hasAudio = data.includes("Stream #0:1");
        },
      });

      if (!hasAudio) {
        await showToast({
          title: "No audio stream found",
          style: Toast.Style.Failure,
          message: "The selected video does not contain an audio stream.",
        });

        return;
      }

      await executeFFmpegCommandAsync({
        command: `${command}`,
        onContent: async (data) => {
          console.log(data);
          const match = data.match(/Duration: ([\d:.]+)/);
          if (match && match[1]) {
            totalDuration = getTimeInSeconds(match[1]);
          }

          const timeMatch = data.match(/time=([\d:.]+)/);
          if (timeMatch && timeMatch[1] && totalDuration) {
            const currentTime = getTimeInSeconds(timeMatch[1]);
            const percentage = (currentTime / totalDuration) * 100;
            const percentageRounded = Math.round(percentage * 100) / 100;

            // calculate estimated remaining time
            const remainingTime = ((100 - percentage) / percentage) * currentTime;

            convertingToast.message = `${percentageRounded}% - Estimated remaining time: ${formatTime(remainingTime)}`;
          }
        },
      });

      await showToast({
        title: "Audio Extracted",
        style: Toast.Style.Success,
        message: `Audio has been extracted and saved as ${outputPath}.`,
      });
    } catch (error) {
      console.error(error);
      await showToast({
        title: "Error extracting audio",
        style: Toast.Style.Failure,
        message: (error as Error).message,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Extract Audio" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="audioFormat" title="Audio Format">
        <Form.Dropdown.Item title="MP3" value="mp3" />
        <Form.Dropdown.Item title="AAC" value="aac" />
        <Form.Dropdown.Item title="WAV" value="wav" />
        <Form.Dropdown.Item title="FLAC" value="flac" />
      </Form.Dropdown>
    </Form>
  );
}
