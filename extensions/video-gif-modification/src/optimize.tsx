import { Toast as RaycastToast, showHUD } from "@raycast/api";
import { Ffmpeg } from "./objects/ffmpeg";
import { FfmpegVideo } from "./objects/ffmpeg.video";
import { Ffprobe } from "./objects/ffprobe";
import { FinderIsNotFrontmostAppException, SelectedFinderFiles } from "./objects/selected-finder.files";
import { Toast } from "./objects/toast";

export default async function Command(props: { arguments: { preset: "smallest-size" | "optimal" | "best-quality" } }) {
  const { preset } = props.arguments;
  const toast = new Toast();
  const ffmpeg = new Ffmpeg(
    new Ffprobe({
      onStatusChange: async (status) => {
        await toast.show({ title: status, style: RaycastToast.Style.Animated });
      },
    }),
    {
      onStatusChange: async (status) => {
        await toast.show({ title: status, style: RaycastToast.Style.Animated });
      },
      onProgressChange: async (progress) => {
        await toast.updateProgress(Math.round(progress * 100));
      },
    },
  );

  try {
    const files = await new SelectedFinderFiles().list();

    if (files.length === 0) {
      throw new Error("Please select any Video in Finder");
    }

    if (files.some((file) => file.extension() === ".gif")) {
      throw new Error("Does not applicable to GIFs yet");
    }

    for (const file of files) {
      await new FfmpegVideo(ffmpeg, file).encode({ preset });
    }

    await showHUD("All Videos are Processed");
  } catch (err) {
    if (err instanceof FinderIsNotFrontmostAppException) {
      await toast.show({ title: "Please put Finder in focus and try again", style: RaycastToast.Style.Failure });
      return;
    }

    if (err instanceof Error) {
      console.error(err);
      await toast.show({ title: err.message, style: RaycastToast.Style.Failure });
    }
  }
}
