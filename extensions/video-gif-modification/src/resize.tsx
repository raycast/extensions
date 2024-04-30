import { Toast as RaycastToast } from "@raycast/api";
import * as path from "path";
import { Ffmpeg } from "./objects/ffmpeg";
import { Ffprobe } from "./objects/ffprobe";
import { Gif } from "./objects/gif";
import { SelectedFinderFiles } from "./objects/selected-finder.files";
import { Toast } from "./objects/toast";
import { Video } from "./objects/video";

export default async function Command(props: { arguments: { width: string; height: string } }) {
  const toast = new Toast();

  try {
    const { width: providedWidth, height: providedHeight } = props.arguments;

    if (!providedWidth && !providedHeight) {
      await toast.show({ title: "Width or Height should be proivded", style: RaycastToast.Style.Failure });
      return;
    }

    const files = await new SelectedFinderFiles().list();

    if (files.length === 0) {
      await toast.show({ title: "Please select any video in Finder", style: RaycastToast.Style.Failure });
      return;
    }

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

    for (const file of files) {
      const width = providedWidth !== "" ? parseInt(providedWidth, 10) : undefined;
      const height = providedHeight !== "" ? parseInt(providedHeight, 10) : undefined;

      const extension = path.extname(file.path());
      if (extension === ".gif") {
        await new Gif(file, ffmpeg).encode({ width, height });
      } else {
        await new Video(file, ffmpeg).encode({ width, height });
      }
    }

    await toast.show({ title: "All videos processed", style: RaycastToast.Style.Success });
  } catch (err) {
    if (err instanceof Error) {
      console.error(err);
      await toast.show({ title: err.message, style: RaycastToast.Style.Success });
    }
  }
}
