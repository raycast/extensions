import { Toast as RaycastToast } from "@raycast/api";
import { Operation } from "../abstractions";
import { NoFilesProvidedException } from "./encode.operation";
import { FfmpegBinaryNotFoundException } from "./ffmpeg";
import { FfprobeBinaryNotFoundException } from "./ffprobe";
import { FinderIsNotFrontmostAppException } from "./selected-finder.files";
import { Toast } from "./toast";

/**
 * Run any operation, catch all possible errors and show toast if any.
 */
export class SafeOperation implements Operation {
  constructor(
    private readonly origin: Operation,
    private readonly toast: Toast,
  ) {}

  run: Operation["run"] = async () => {
    try {
      await this.origin.run();
    } catch (err) {
      if (err instanceof FfmpegBinaryNotFoundException || err instanceof FfprobeBinaryNotFoundException) {
        await this.toast.show({
          title: "FFmpeg is not installed. Please install FFmpeg or specify its path in the extension settings.",
          style: RaycastToast.Style.Failure,
        });
        return;
      }

      if (err instanceof FinderIsNotFrontmostAppException) {
        await this.toast.show({ title: "Please put Finder in focus and try again", style: RaycastToast.Style.Failure });
        return;
      }

      if (err instanceof NoFilesProvidedException) {
        await this.toast.show({ title: "Please select any Video in Finder", style: RaycastToast.Style.Failure });
        return;
      }

      if (err instanceof Error) {
        console.error(err);
        await this.toast.show({ title: err.message, style: RaycastToast.Style.Failure });
      }
    }
  };
}
