type Input = {
  /**
   * Which file path to get metadata about
   */
  filePath: string;
};

import { getFileInfoData } from "../utils/ffmpeg";
import path from "path";
export default async function (input: Input) {
  const resolvedPath = path.resolve(input.filePath.replace(/^~\//, `${process.env.HOME}/`));
  const fileInfo = getFileInfoData(resolvedPath);
  return fileInfo;
}
