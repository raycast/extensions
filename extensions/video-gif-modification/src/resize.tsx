import { Toast as RaycastToast } from "@raycast/api";
import { Ffmpeg } from "./objects/ffmpeg";
import { Ffprobe } from "./objects/ffprobe";
import { Gif } from "./objects/gif";
import { SafeNumber } from "./objects/safe.number";
import { FinderIsNotFrontmostApp, SelectedFinderFiles } from "./objects/selected-finder.files";
import { Toast } from "./objects/toast";
import { Video } from "./objects/video";

export default async function Command(props: { arguments: { width: string; height: string } }) {
  const width = new SafeNumber(props.arguments.width);
  const height = new SafeNumber(props.arguments.height);
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
    if (width.toInt() == null && height.toInt() == null) {
      throw new Error("Please specify Width or Height and they must both be numbers");
    }

    const files = await new SelectedFinderFiles().list();

    if (files.length === 0) {
      throw new Error("Please select any Video in Finder");
    }

    for (const file of files) {
      if (file.extension() === ".gif") {
        await new Gif(file, ffmpeg).encode({
          width: width.toInt(),
          height: height.toInt(),
        });
        continue;
      }

      await new Video(file, ffmpeg).encode({
        width: width.toInt(),
        height: height.toInt(),
      });
    }

    await toast.show({ title: "All Videos are Processed", style: RaycastToast.Style.Success });
  } catch (err) {
    if (err instanceof FinderIsNotFrontmostApp) {
      await toast.show({ title: "Please put Finder in focus and try again", style: RaycastToast.Style.Failure });
      return;
    }

    if (err instanceof Error) {
      console.error(err);
      await toast.show({ title: err.message, style: RaycastToast.Style.Failure });
    }
  }
}
