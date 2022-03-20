import path from "path";
import Jimp from "jimp";

import { showToast, Toast } from "@raycast/api";
import { existsSync } from "fs";

const imageExtensions: string[] = [".jpg", ".jpeg", ".png"];

export const isImagePath = (text: string): boolean =>
  path.isAbsolute(text) && imageExtensions.includes(path.extname(text)) && existsSync(text);

export const isImageReference = (text: string): boolean =>
  text.startsWith("file:///") &&
  imageExtensions.includes(path.extname(text)) &&
  existsSync(decodeURI(text).substring(7));

export const createNewName = (filePath: string): string => {
  const dir = path.dirname(filePath);
  const extension = path.extname(filePath);
  const filename = path.basename(filePath, extension);

  if (extension === ".png") return `${dir}/${filename}.jpg`;
  if (extension === ".jpg" || extension === ".jpeg") return `${dir}/${filename}.png`;
  throw new Error("Unknown image extension");
};

export const convertFile = async (filePath: string): Promise<any> => {
  await showToast({ style: Toast.Style.Animated, title: "Converting image" });

  return new Promise((resolve, reject) => {
    return Jimp.read(filePath)
      .then((image) => {
        const newName = createNewName(filePath);
        image.write(newName);

        return resolve(newName);
      })
      .catch((e) => {
        reject(e);
      });
  });
};
