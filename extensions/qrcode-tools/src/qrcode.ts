import fs from "fs";
import Jimp from "jimp";
import QR, { QRCode } from "jsqr";
import { create, toFile } from "qrcode";
import { getTempFilePath } from "./fs";

export async function readFileAsPicture(filepath: string): Promise<Jimp["bitmap"]> {
  const data = await Jimp.read(filepath);
  return data.bitmap;
}

export async function readFileAsBuffer(fileURL: string): Promise<Buffer> {
  const [protocol, path] = fileURL.split("://");
  if (protocol && path) {
    if (protocol === "file") {
      return fs.promises.readFile(path);
    }

    throw new Error(`Unknown protocol of ${protocol}`);
  }

  return fs.promises.readFile(protocol);
}

export async function decodeImage(fileURL: string): Promise<QRCode> {
  const [protocol, path] = fileURL.split("://");
  if (protocol === "file") {
    return decodeImageFromFile(path);
  }

  throw new Error(`Unknown protocol of ${protocol}`);
}

export async function decodeImageFromFile(filepath: string) {
  const image = await Jimp.read(filepath);
  const dataArray = new Uint8ClampedArray(image.bitmap.data.buffer);
  const text = await QR(dataArray, image.bitmap.width, image.bitmap.height);
  if (!text) {
    throw new Error(`The image is not a QRCode.`);
  }
  return text;
}

export async function decodeImageFromArrayBuffer(buffer: Buffer) {
  const image = await Jimp.read(buffer);
  return image;
}

export async function createQRCodeFromImage(image: Jimp) {
  const dataArray = new Uint8ClampedArray(image.bitmap.data.buffer);
  const text = await QR(dataArray, image.bitmap.width, image.bitmap.height);
  if (!text) {
    throw new Error(`This image is not a QRCode`);
  }
  return text;
}

export interface QRCodeTextType {
  url: boolean;
}

export function analyzeQRCodeType(text: string) {
  const type: QRCodeTextType = {
    url: false,
  };

  {
    const array = text.split("://");
    if (array.length === 2) {
      type.url = true;
    }
  }

  return type;
}

export async function generateQRCode(text: string) {
  const code = create(text);

  return code.modules;
}

export async function generateQRCodeToFile(text: string) {
  const tempFile = await getTempFilePath();
  await new Promise<void>((resolve, reject) => {
    toFile(tempFile, text, (error) => {
      if (error) reject(error);
      resolve();
    });
  });

  return tempFile;
}
