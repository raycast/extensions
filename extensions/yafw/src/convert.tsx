import { getPreferenceValues, Toast as RaycastToast } from "@raycast/api";
import { EncodeOperation } from "./objects/encode.operation";
import { Ffmpeg } from "./objects/ffmpeg";
import { FfmpegGif } from "./objects/ffmpeg.gif";
import { FfmpegVideo } from "./objects/ffmpeg.video";
import { Ffprobe } from "./objects/ffprobe";
import { SafeNumber } from "./objects/safe.number";
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

  const preferences = getPreferenceValues<Preferences.Convert>();
  const speed = Number(preferences.gif_speed);
  const gifOptions = {
    fps: Math.min(60, Math.max(1, new SafeNumber(preferences.gif_fps).toInt() ?? 15)),
    quality: Math.min(100, Math.max(1, new SafeNumber(preferences.gif_quality).toInt() ?? 90)),
    speed: Number.isFinite(speed) && speed > 0 ? speed : 1,
    loop: preferences.gif_loop === "once" ? ("once" as const) : ("forever" as const),
  };

  await new SafeOperation(
    new EncodeOperation(files, async (selectedFiles) => {
      for (const file of selectedFiles) {
        await toast.show({
          title: `Converting "${file.name()}${file.extension()}"`,
          style: RaycastToast.Style.Animated,
        });

        if (format === "gif") {
          await new FfmpegGif(ffmpeg, file).encode(gifOptions);
          continue;
        }

        await new FfmpegVideo(ffmpeg, file).encode({ format });
      }
    }),
    toast,
  ).run();
}
