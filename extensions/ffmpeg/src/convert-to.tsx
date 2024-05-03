import { Action, ActionPanel, Form, Toast, confirmAlert, showToast } from "@raycast/api";
import { TipForInstallFFmpeg } from "./components/tipForInstallFFmpeg";
import { executeFFmpegCommandAsync, isFFmpegInstalled } from "./utils/ffmpeg";
import { getSelectedVideos } from "./utils/fs";
import { formatTime, getTimeInSeconds } from "./utils/time";
import fs from "fs";

const ffmpegInstalled = isFFmpegInstalled();

export default function ConvertTo() {
  if (!ffmpegInstalled) {
    return <TipForInstallFFmpeg />;
  }

  const paths = getSelectedVideos();

  const handleSubmit = async (values: {
    format: string;
    videoCodec: string;
    audioCodec: string;
    resolution: string;
    videoBitrate: string;
    audioBitrate: string;
    frameRate: string;
    optimize: boolean;
    audio: boolean;
  }) => {
    try {
      const { format, videoCodec, audioCodec, resolution, videoBitrate, audioBitrate, frameRate, optimize, audio } =
        values;

      let command = `-i "${paths[0]}"`;

      if (videoCodec) {
        command += ` -c:v ${videoCodec}`;
      }

      if (audio) {
        if (audioCodec) {
          command += ` -c:a ${audioCodec}`;
        }
      } else {
        command += " -an"; // Disable audio
      }

      if (resolution) {
        command += ` -s ${resolution}`;
      }

      if (videoBitrate) {
        command += ` -b:v ${videoBitrate}`;
      }

      if (audioBitrate) {
        command += ` -b:a ${audioBitrate}`;
      }

      if (frameRate) {
        command += ` -r ${frameRate}`;
      }

      if (optimize) {
        command += " -preset slower";
      }

      command += ` "${paths[0].substring(0, paths[0].lastIndexOf("."))}.${format}"`;

      const convertingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Converting...",
      });

      let totalDuration = 0;

      const expectedOutput = `${paths[0].substring(0, paths[0].lastIndexOf("."))}.${format}`;

      const alreadyExists = fs.existsSync(expectedOutput);

      if (alreadyExists) {
        const deleteExisting = await confirmAlert({
          title: "File already exists",
          message: "The file already exists. Do you want to replace it?",
        });

        if (deleteExisting) {
          fs.unlinkSync(expectedOutput);
        } else {
          return;
        }
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
        title: "File converted",
        style: Toast.Style.Success,
        message: `The file has been converted to ${format}.`,
      });
    } catch (error) {
      await showToast({
        title: "Error",
        style: Toast.Style.Failure,
        message: (error as Error).message,
      });
    }
  };

  return (
    <Form
      navigationTitle={paths[0]}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="format" title="Format" defaultValue="mp4">
        <Form.Dropdown.Item title="mp4" value="mp4" />
        <Form.Dropdown.Item title="avi" value="avi" />
        <Form.Dropdown.Item title="mov" value="mov" />
        <Form.Dropdown.Item title="mkv" value="mkv" />
        <Form.Dropdown.Item title="wmv" value="wmv" />
        <Form.Dropdown.Item title="flv" value="flv" />
        <Form.Dropdown.Item title="webm" value="webm" />
        <Form.Dropdown.Item title="mp3" value="mp3" />
        <Form.Dropdown.Item title="wav" value="wav" />
      </Form.Dropdown>
      <Form.Description text="You can omit most of the things below if you just want to perform a basic conversion. Default values will be used." />
      <Form.Separator />
      <Form.Checkbox id="optimize" label="Optimize for size" title="Optimize" defaultValue={false} />
      <Form.Dropdown id="videoCodec" title="Video Codec">
        <Form.Dropdown.Item title="Default" value="" />
        <Form.Dropdown.Item title="H.264" value="libx264" />
        <Form.Dropdown.Item title="H.265" value="libx265" />
        <Form.Dropdown.Item title="VP9" value="libvpx-vp9" />
        <Form.Dropdown.Item title="AV1" value="libaom-av1" />
      </Form.Dropdown>
      {/*  */}
      <Form.Checkbox label="Audio" id="audio" title="Audio" defaultValue={true} />
      <Form.Dropdown id="audioCodec" title="Audio Codec">
        <Form.Dropdown.Item title="Default" value="" />
        <Form.Dropdown.Item title="AAC" value="aac" />
        <Form.Dropdown.Item title="MP3" value="libmp3lame" />
        <Form.Dropdown.Item title="Opus" value="libopus" />
        <Form.Dropdown.Item title="Vorbis" value="libvorbis" />
      </Form.Dropdown>
      <Form.TextField id="resolution" title="Resolution" placeholder="e.g., 1920x1080" />
      <Form.TextField id="videoBitrate" title="Video Bitrate" placeholder="e.g., 1200k (for 1.2 Mbps)" />
      <Form.TextField id="audioBitrate" title="Audio Bitrate" placeholder="e.g., 192k (for 192 kbps)" />
      <Form.TextField id="frameRate" title="Frame Rate" placeholder="e.g., 30, 60" />
    </Form>
  );
}
