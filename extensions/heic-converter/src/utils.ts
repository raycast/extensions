import fs from 'fs';
import convert from 'heic-convert';
import { basename, dirname, extname, join } from 'path';
import { getSelectedFinderItems, showHUD, showToast, Toast } from '@raycast/api';

export enum ImageType {
  PNG = 'PNG' ,
  JPEG = 'JPEG'
}

const convertImage = async (
  filePath: string,
  type: ImageType
) => {
  const inputBuffer = fs.readFileSync(filePath);
  const outputBuffer = await convert({
    buffer: inputBuffer,
    format: type
  });

  const outputDir = dirname(filePath);
  const fileName = basename(filePath)
  const extName = extname(filePath)
  const outputFileName = fileName.replace(extName, `.${type}`)
  const outputPath = join(outputDir, outputFileName);
  fs.writeFileSync(outputPath, outputBuffer as never)
}

export const convertImages = async (type: ImageType) => {
  let filePaths: string[];

  try {
    filePaths = (await getSelectedFinderItems()).map((f) => f.path);
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: e instanceof Error ? e.message : "Could not get the selected Finder items",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "In the process of conversion...",
  });

  try {
    await Promise.all(filePaths.map((filePath) => convertImage(filePath, type)));

    await showHUD(
      `Successful conversion 🎉`
    );
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error";
    toast.message = e instanceof Error ? e.message : "Conversion failed";
  }
}
