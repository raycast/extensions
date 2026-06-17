import { getSelectedFinderItems, Clipboard } from "@raycast/api";
import { Image, Imager, Input } from "../types";
import path from "path";
import { fileTypeFromFile } from "file-type";
import fs from "fs";

const ImageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".avif", ".apng"];

export async function getImages(): Promise<Image[]> {
  let images: Image[];

  try {
    images = await getImagesFromSelectedFinderItems(isImage);
  } catch (e) {
    // if finder is not the front-most application will throw an error
    // we can try to get images from clipboard as a fallback
    images = await getImagesFromClipboard();
  }

  if (images.length === 0) {
    throw new Error(
      "cannot get images from both finder and clipboard, or the image is not supported, we only support " +
        ImageExtensions.join(", "),
    );
  }

  return images;
}

export async function getFiles(): Promise<Image[]> {
  return await getImagesFromSelectedFinderItems(isFile);
}

export function buildNewImageName(image: Image, extension: string): string {
  const originName = path.basename(image.value);
  const ext = path.extname(originName);
  const newExt = normalizeExtension(extension);

  if (!ext) {
    return `${originName}${newExt}`;
  }

  return originName.replace(new RegExp(`${ext}$`), newExt);
}

export function imageExtensionToMimeType(extension: string): string {
  extension = normalizeExtension(extension);

  switch (extension) {
    case ".apng":
      return "image/apng";
    case ".avif":
      return "image/avif";
    case ".jpg":
    case ".jpeg":
    case ".jfif":
    case ".pjpeg":
    case ".pjp":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      throw new Error("Unsupported image extension");
  }
}

async function getImagesFromSelectedFinderItems(filter: (p: string) => boolean): Promise<Image[]> {
  return (await getSelectedFinderItems())
    .map((f) => f.path)
    .filter(filter)
    .map((p) => toImage(p));
}

async function getImagesFromClipboard(): Promise<Image[]> {
  const { text, file } = await Clipboard.read();
  const image = text && text.startsWith("http") ? await getImagesFromURL() : await getImageFromFileProtocol(file);

  return image ? [image] : [];
}

async function getImageFromFileProtocol(file?: string): Promise<Image | null> {
  if (!file || !file.startsWith("file://")) {
    return null;
  }

  console.log("get image from file protocol: ", file);

  // format image path to convert %20 to space
  const p = file.replaceAll("%20", " ").replace("file://", "");
  const meta = await fileTypeFromFile(p);

  if (!meta) {
    console.error("cannot get file type for clipboard file path, file: ", file);
    return null;
  }

  return meta.mime.startsWith("image/") && isImage(`.${meta.ext}`) ? { type: "filepath", value: p } : null;
}

async function getImagesFromURL(): Promise<Image | null> {
  throw new Error("process image from url is not supported yet");
}

function normalizeExtension(extension: string): string {
  extension = extension.toLowerCase();

  return extension.startsWith(".") ? extension : `.${extension}`;
}

export class EasyImager implements Imager {
  private image: Image;

  constructor(i: Input) {
    this.image = i as Image;
  }

  get(): Image {
    return this.image;
  }

  set(i: Image): void {
    this.image = i;
  }
}

export function isImage(path: string): boolean {
  return ImageExtensions.some((ext) => path.endsWith(ext));
}

export function isFile(path: string): boolean {
  return fs.existsSync(path);
}

function toImage(path: string): Image {
  return { type: "filepath", value: path };
}
