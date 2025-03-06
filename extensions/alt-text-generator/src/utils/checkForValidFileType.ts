import { SUPPORTED_EXTENSIONS } from "./constants";
import path from "path";

export const checkForValidFileType = (localImagePath: string) => {
  const fileType = path.extname(localImagePath).toLowerCase();

  return { isValid: SUPPORTED_EXTENSIONS.includes(fileType), fileType: fileType };
};
