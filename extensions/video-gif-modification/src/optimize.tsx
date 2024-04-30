import { Toast as RaycastToast, showToast } from "@raycast/api";
import * as path from "path";
import { Ffmpeg } from "./objects/ffmpeg";
import { Ffprobe } from "./objects/ffprobe";
import { SelectedFinderFiles } from "./objects/selected-finder.files";
import { Toast } from "./objects/toast";
import { Video } from "./objects/video";

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
      await toast.show({ title: "Please select any Video in Finder", style: RaycastToast.Style.Failure });
      return;
    }

    for (const file of files) {
      const extension = path.extname(file.path());
      if (extension === ".gif") {
        throw new Error("Does not applicable to GIFs yet");
      }

      await new Video(file, ffmpeg).encode({ preset });
    }

    await showToast({ title: "All Videos are Processed", style: RaycastToast.Style.Success });
  } catch (err) {
    if (err instanceof Error) {
      console.error(err);
      await toast.show({ title: err.message, style: RaycastToast.Style.Failure });
    }
  }
}
