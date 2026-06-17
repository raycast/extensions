import * as path from "path";
import { ClassificationSpecificEnum } from "@pieces.app/pieces-os-client";
import { ClassificationKey } from "../../types/ClassificationKey";

/**
 * Takes a file extension and look s for classification specific enum value.
 * a nice TODO: enable support for extensions with dots and dashes
 * @param fileExtension
 */
export const getClassificationSpecificEnum = (
  fileExtension: string,
): ClassificationSpecificEnum | undefined => {
  if (fileExtension.startsWith(".")) {
    fileExtension = fileExtension.slice(1);
  }
  if (fileExtension === "ipynb") {
    return ClassificationSpecificEnum.Py;
  }
  return ClassificationSpecificEnum[
    (fileExtension.charAt(0).toUpperCase() +
      fileExtension.slice(1)) as ClassificationKey
  ];
};

export const getFileExtension = (fsPath: string) =>
  path.parse(fsPath).ext.substring(1) || "Unknown";

export const parseFilePath = (fsPath?: string) => {
  const { base, ext, name } = path.parse(fsPath || "");
  return { base, name, ext: getClassificationSpecificEnum(ext) };
};
