import { Toast as RaycastToast } from "@raycast/api";
import { EncodeOperation } from "./objects/encode.operation";
import { Ffmpeg } from "./objects/ffmpeg";
import { FfmpegGif } from "./objects/ffmpeg.gif";
import { FfmpegVideo } from "./objects/ffmpeg.video";
import { Ffprobe } from "./objects/ffprobe";
import { SafeNumber } from "./objects/safe.number";
import { SafeOperation } from "./objects/safe.operation";
import { SelectedFinderFiles } from "./objects/selected-finder.files";
import { Toast } from "./objects/toast";

export default async function Command(props: { arguments: { width: string; height: string } }) {
  const width = new SafeNumber(props.arguments.width);
  const height = new SafeNumber(props.arguments.height);
  const files = new SelectedFinderFiles();
  const toast = new Toast();
  const ffmpeg = new Ffmpeg(new Ffprobe(), {
    onProgressChange: async (progress) => {
      await toast.updateProgress(Math.round(progress * 100));
    },
  });

  if (width.toInt() == null && height.toInt() == null) {
    await toast.show({
      title: "Please specify Width or Height and they must both be numbers",
      style: RaycastToast.Style.Failure,
    });
    return;
  }

  await new SafeOperation(
    new EncodeOperation(files, async (selectedFiles) => {
      for (const file of selectedFiles) {
        await toast.show({ title: `Resizing "${file.name()}${file.extension()}"`, style: RaycastToast.Style.Animated });

        if (file.extension() === ".gif") {
          await new FfmpegGif(ffmpeg, file).encode({
            width: width.toInt(),
            height: height.toInt(),
          });
          continue;
        }

        await new FfmpegVideo(ffmpeg, file).encode({
          width: width.toInt(),
          height: height.toInt(),
        });
      }
    }),
    toast,
  ).run();
}
