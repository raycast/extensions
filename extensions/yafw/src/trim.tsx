import { Toast as RaycastToast } from "@raycast/api";
import { EncodeOperation } from "./objects/encode.operation";
import { Ffmpeg } from "./objects/ffmpeg";
import { FfmpegVideo } from "./objects/ffmpeg.video";
import { Ffprobe } from "./objects/ffprobe";
import { SafeOperation } from "./objects/safe.operation";
import { SelectedFinderFiles } from "./objects/selected-finder.files";
import { Toast } from "./objects/toast";

export default async function Command(props: { arguments: Arguments.Trim }) {
  const { startTime, endTime, duration } = props.arguments;
  const files = new SelectedFinderFiles();
  const toast = new Toast();
  const ffmpeg = new Ffmpeg(new Ffprobe(), {
    onProgressChange: async (progress) => {
      await toast.updateProgress(Math.round(progress * 100));
    },
  });

  if (!startTime) {
    await toast.show({
      title: "Please specify a start time",
      style: RaycastToast.Style.Failure,
    });
    return;
  }

  if (!endTime && !duration) {
    await toast.show({
      title: "Please specify either an end time or duration",
      style: RaycastToast.Style.Failure,
    });
    return;
  }

  if (endTime && duration) {
    await toast.show({
      title: "Please specify either an end time or duration, not both",
      style: RaycastToast.Style.Failure,
    });
    return;
  }

  await new SafeOperation(
    new EncodeOperation(files, async (selectedFiles) => {
      for (const file of selectedFiles) {
        await toast.show({
          title: `Trimming "${file.name()}${file.extension()}"`,
          style: RaycastToast.Style.Animated,
        });
        await new FfmpegVideo(ffmpeg, file).trim({
          startTime,
          endTime,
          duration,
        });
      }
    }),
    toast,
  ).run();
}
