import * as fs from "fs";
import * as path from "path";
import { cacheDirForPreviewImage } from "../fs";
import { getFileMD5 } from "../md5";
import { executeFFmpegCommandAsync } from "./execute";

export const generatePreviewImage = async ({ filePath: videoFilePath }: { filePath: string }) => {
  const outputImageName = getFileMD5(videoFilePath) + ".jpg";
  const previewImageFilePath = path.join(cacheDirForPreviewImage, outputImageName);

  if (fs.existsSync(previewImageFilePath)) {
    return {
      filePath: videoFilePath,
      previewImageFilePath,
    };
  }

  const command = `-i ${JSON.stringify(
    videoFilePath
  )} -vf "select=eq(n\\,0)" -q:v 50 -frames:v 1 ${previewImageFilePath}`;

  try {
    await executeFFmpegCommandAsync({ command });
    return {
      filePath: videoFilePath,
      previewImageFilePath,
    };
  } catch (error) {
    return { error };
  }
};
