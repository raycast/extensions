import { Toast as RaycastToast, showHUD } from "@raycast/api";
import { Ffmpeg } from "./objects/ffmpeg";
import { FfmpegGif } from "./objects/ffmpeg.gif";
import { FfmpegVideo } from "./objects/ffmpeg.video";
import { Ffprobe } from "./objects/ffprobe";
import { FinderIsNotFrontmostAppException, SelectedFinderFiles } from "./objects/selected-finder.files";
import { Toast } from "./objects/toast";

export default async function Command(props: { arguments: { format: "mp4" | "webm" | "gif" } }) {
  const { format } = props.arguments;
  const toast = new Toast();
  const files = new SelectedFinderFiles();
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
    const selectedFiles = await files.list();

    if (selectedFiles.length === 0) {
      throw new Error("Please select any Video in Finder");
    }

    for (const file of selectedFiles) {
      if (format === "gif") {
        await new FfmpegGif(ffmpeg, file).encode();
        continue;
      }

      await new FfmpegVideo(ffmpeg, file).encode({ format });
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
