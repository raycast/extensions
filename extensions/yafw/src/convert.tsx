import { Toast as RaycastToast } from "@raycast/api";
import { EncodeOperation } from "./objects/encode.operation";
import { Ffmpeg } from "./objects/ffmpeg";
import { FfmpegGif } from "./objects/ffmpeg.gif";
import { FfmpegVideo } from "./objects/ffmpeg.video";
import { Ffprobe } from "./objects/ffprobe";
import { SafeOperation } from "./objects/safe.operation";
import { SelectedFinderFiles } from "./objects/selected-finder.files";
import { Toast } from "./objects/toast";

export default async function Command(props: { arguments: { format: "mp4" | "webm" | "gif" } }) {
  const { format } = props.arguments;
  const toast = new Toast();
  const files = new SelectedFinderFiles();
  const ffmpeg = new Ffmpeg(new Ffprobe(), {
    onProgressChange: async (progress) => {
      await toast.updateProgress(Math.round(progress * 100));
    },
  });

  await new SafeOperation(
    new EncodeOperation(files, async (selectedFiles) => {
      for (const file of selectedFiles) {
        await toast.show({
          title: `Converting "${file.name()}${file.extension()}"`,
          style: RaycastToast.Style.Animated,
        });

        if (format === "gif") {
          await new FfmpegGif(ffmpeg, file).encode();
          continue;
        }

        await new FfmpegVideo(ffmpeg, file).encode({ format });
      }
    }),
    toast,
  ).run();
}
