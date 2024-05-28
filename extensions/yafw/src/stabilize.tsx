import { Toast as RaycastToast } from "@raycast/api";
import { EncodeOperation } from "./objects/encode.operation";
import { Ffmpeg } from "./objects/ffmpeg";
import { FfmpegVideo } from "./objects/ffmpeg.video";
import { Ffprobe } from "./objects/ffprobe";
import { SafeOperation } from "./objects/safe.operation";
import { SelectedFinderFiles } from "./objects/selected-finder.files";
import { Toast } from "./objects/toast";

export default async function Command() {
  const files = new SelectedFinderFiles();
  const toast = new Toast();
  const ffmpeg = new Ffmpeg(new Ffprobe(), {
    onProgressChange: async (progress) => {
      await toast.updateProgress(Math.round(progress * 100));
    },
  });

  await new SafeOperation(
    new EncodeOperation(files, async (selectedFiles) => {
      // @NOTE: I don't think this is a valuable command for GIFs at all.
      // But it could easily be included if we decide to do so.
      // Beware that this feature has not been tested on GIFs, so please test it if you enable it.
      if (selectedFiles.some((file) => file.extension() === ".gif")) {
        throw new Error("Does not applicable to GIFs yet");
      }

      for (const file of selectedFiles) {
        await toast.show({
          title: `Stabilizing "${file.name()}${file.extension()}"`,
          style: RaycastToast.Style.Animated,
        });
        await new FfmpegVideo(ffmpeg, file).stabilize();
      }
    }),
    toast,
  ).run();
}
