import { getSelectedFinderItems } from "@raycast/api";
import path from "node:path";
import { Converter } from "./converters.utils";
import { errorUtils } from "./errors.utils";

const hasCorrectExtension = (path: string) => {
  const extensions = ["mp3", "wav", "flac", "ogg", "m4a", "aac", "mp4"];
  return extensions.some((extension) => path.toLowerCase().endsWith(`.${extension}`));
};

const getSelectedFilePaths = async () => {
  const files = await getSelectedFinderItems();
  const paths = files.map((file) => file.path).filter(hasCorrectExtension);
  if (!paths.length) errorUtils.throwError(errorUtils.CONSTANTS.noSongsSelected);
  return paths;
};

const getInputName = (inputPath: string) => {
  return path.basename(inputPath, path.extname(inputPath));
};

const getOutputPath = (inputPath: string, fileNameSuffix: Converter["fileNameSuffix"]) => {
  const inputName = getInputName(inputPath);
  return path.join(path.dirname(inputPath), `${inputName}-${fileNameSuffix}.mp3`);
};

export const fileUtils = {
  getSelectedFilePaths,
  hasCorrectExtension,
  getInputName,
  getOutputPath,
};
