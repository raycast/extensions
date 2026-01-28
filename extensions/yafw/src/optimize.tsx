import { Toast as RaycastToast } from "@raycast/api";
import { EncodeOperation } from "./objects/encode.operation";
import { Ffmpeg } from "./objects/ffmpeg";
import { FfmpegVideo } from "./objects/ffmpeg.video";
import { Ffprobe } from "./objects/ffprobe";
import { SafeOperation } from "./objects/safe.operation";
import { SelectedFinderFiles } from "./objects/selected-finder.files";
import { Toast } from "./objects/toast";

export default async function Command(props: { arguments: { preset: "smallest-size" | "optimal" | "best-quality" } }) {
  const { preset } = props.arguments;
  const files = new SelectedFinderFiles();
  const toast = new Toast();
  const ffmpeg = new Ffmpeg(new Ffprobe(), {
    onProgressChange: async (progress) => {
      await toast.updateProgress(Math.round(progress * 100));
    },
  });

  await new SafeOperation(
    new EncodeOperation(files, async (selectedFiles) => {
      // @NOTE: this is disabled because of a problem with ffmpeg when it makes the GIF size larger than it was before.
      // This might be due to internal palette building algorithms of ffmpeg itself.
      // @TODO: we should look for a way to enable this optimization for gifs as well.
      if (selectedFiles.some((file) => file.extension() === ".gif")) {
        throw new Error("Does not applicable to GIFs yet");
      }

      for (const file of selectedFiles) {
        await toast.show({
          title: `Optimizing "${file.name()}${file.extension()}"`,
          style: RaycastToast.Style.Animated,
        });
        await new FfmpegVideo(ffmpeg, file).encode({ preset });
      }
    }),
    toast,
  ).run();
}
