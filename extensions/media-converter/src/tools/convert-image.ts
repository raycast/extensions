import { convertImage, ImageOutputFormats } from "../utils/converter";
import { isFFmpegInstalled } from "../utils/ffmpeg";
import { getFullPath } from "../utils/get-full-path";
import { Tool } from "@raycast/api";

type Input = {
  /** the absolute path to the file that the user wants to convert */
  inputPath: string;
  /** the file type to convert the input file to */
  outputFileType: ImageOutputFormats;
};

export default async function ConvertImage({ inputPath, outputFileType }: Input) {
  const installed = await isFFmpegInstalled();
  if (!installed) {
    return {
      type: "error",
      message: "FFmpeg is not installed. Please install FFmpeg to use this tool.",
    };
  }
  const fullPath = await getFullPath(inputPath);
  try {
    const outputPath = await convertImage(fullPath, outputFileType);
    return {
      type: "success",
      message: `The image was converted successfully. Converted file path: ${outputPath}`,
    };
  } catch (error) {
    console.error(error);
    return {
      type: "error",
      message: `The image could not be converted. Error: ${error}`,
    };
  }
}

export const confirmation: Tool.Confirmation<Input> = async ({ inputPath, outputFileType }: Input) => {
  const fullPath = await getFullPath(inputPath);
  const message = "This will create a new file in the same directory.";
  return {
    message,
    info: [
      { name: "Input Path", value: fullPath },
      { name: "Output File Type", value: outputFileType },
    ],
  };
};
