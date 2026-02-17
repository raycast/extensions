import { Toast as RaycastToast } from "@raycast/api";
import { EncodeOperation } from "./objects/encode.operation";
import { Ffmpeg } from "./objects/ffmpeg";
import { FfmpegVideo } from "./objects/ffmpeg.video";
import { Ffprobe } from "./objects/ffprobe";
import { SafeNumber } from "./objects/safe.number";
import { SafeOperation } from "./objects/safe.operation";
import { SelectedFinderFiles } from "./objects/selected-finder.files";
import { Toast } from "./objects/toast";

function parsePresetAspectRatio(value: string): { width: number; height: number } | undefined {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    return undefined;
  }

  const [widthRaw, heightRaw] = normalizedValue.split(":");

  if (widthRaw == null || heightRaw == null) {
    return undefined;
  }

  const width = new SafeNumber(widthRaw).toInt();
  const height = new SafeNumber(heightRaw).toInt();

  if (width == null || height == null || width <= 0 || height <= 0) {
    return undefined;
  }

  return { width, height };
}

function parseCustomAspectRatio(
  widthRaw: string,
  heightRaw: string,
): { width: number; height: number } | null | undefined {
  const normalizedWidth = widthRaw.trim();
  const normalizedHeight = heightRaw.trim();

  if (normalizedWidth.length === 0 && normalizedHeight.length === 0) {
    return undefined;
  }

  const width = new SafeNumber(widthRaw).toInt();
  const height = new SafeNumber(heightRaw).toInt();

  if (width == null || height == null || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

export default async function Command(props: { arguments: Arguments.Crop }) {
  const { preset, width, height } = props.arguments;
  const customAspectRatio = parseCustomAspectRatio(width, height);
  const presetAspectRatio = parsePresetAspectRatio(preset);
  const aspectRatio = customAspectRatio ?? presetAspectRatio;
  const files = new SelectedFinderFiles();
  const toast = new Toast();
  const ffmpeg = new Ffmpeg(new Ffprobe(), {
    onProgressChange: async (progress) => {
      await toast.updateProgress(Math.round(progress * 100));
    },
  });

  if (customAspectRatio === null) {
    await toast.show({
      title: "For custom ratio, specify numeric width and height (e.g. 10 and 9)",
      style: RaycastToast.Style.Failure,
    });
    return;
  }

  if (aspectRatio == null) {
    await toast.show({
      title: "Choose a preset or enter custom width and height",
      style: RaycastToast.Style.Failure,
    });
    return;
  }

  await new SafeOperation(
    new EncodeOperation(files, async (selectedFiles) => {
      if (selectedFiles.some((file) => file.extension() === ".gif")) {
        throw new Error("GIFs are not supported for this command yet");
      }

      for (const file of selectedFiles) {
        await toast.show({ title: `Cropping "${file.name()}${file.extension()}"`, style: RaycastToast.Style.Animated });

        await new FfmpegVideo(ffmpeg, file).crop({
          aspectRatioWidth: aspectRatio.width,
          aspectRatioHeight: aspectRatio.height,
        });
      }
    }),
    toast,
  ).run();
}
