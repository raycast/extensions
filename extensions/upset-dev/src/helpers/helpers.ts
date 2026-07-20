import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { FormEntry } from "../types/types";
import { SUPPORT_DIR } from "./consts";
import isValidDomain from "is-valid-domain";
import { Jimp } from "jimp";

/** Validate the `domain` of a `FormEntry`. Returns an empty string if it's a valid domain name */
export function validateDomainName(domain: string | undefined): string {
  // check if `domain` is not empty
  if (domain == undefined) {
    return "domain most not be empty! ";
  }

  // check if `domain` is a valid domain name
  if (!isValidDomain(domain, { subdomain: true, wildcard: false, allowUnicode: true, topLevel: false })) {
    return "domain is not valid!";
  }

  return "";
}

/** like `validateSize` but less strict */
export function validateSizeLoose(size: string | undefined): string {
  if (size == undefined || size.length == 0) {
    return "";
  }

  // use number for stricted convertion from `string` to `number`
  const num = Number(size);
  if (Number.isNaN(num) || !Number.isInteger(num)) {
    return "input must be a whole number";
  }

  return "";
}

/** Validates the `size` of a `FormEntry`. Returns an empty string if it's a valid size. */
export function validateSize(size: string | undefined): string {
  if (size == undefined || size.length == 0) {
    return "size is required to be filled";
  }

  // use number for stricted convertion from `string` to `number`
  const num = Number(size);
  if (Number.isNaN(num) || !Number.isInteger(num)) {
    return "input must be a whole number";
  }

  return "";
}

/** Initialized the path to store favicons. It is inside this directory `${environment.supportPath/favicones/}` */
export function initializeSupportDir() {
  if (!fs.existsSync(SUPPORT_DIR)) {
    fs.mkdirSync(SUPPORT_DIR, { recursive: true });
    return;
  }
}

/** Adds fetches favicon and saves is to to `SUPPORT_DIR` with the following format `<domain>-<width>w-<height>h.png`  */
export async function addFaviconeToSupportDir(entry: FormEntry) {
  // url to fetch favicon data, if `width == height` and both is <= 256
  const isARectangle = entry.height == entry.width;
  const isLessMax = Number(entry.width) <= 256 || Number(entry.height) <= 256;
  // if `isARectangle && isLessMax` using `height` or `width` for size parameter in URL would be the same
  // else just get the default favicon size later will be transformed
  const url =
    isARectangle && isLessMax
      ? `https://favicone.com/${entry.domain}?s=${entry.height}`
      : `https://favicone.com/${entry.domain}`;
  // perform a get request from `url` that returns a .png image
  const response = await fetch(url);
  // turn the body of the response into an array of bytes that represents the bytes to construct a png
  const arrayBuffer = await response.arrayBuffer();
  const faviconPngData = Buffer.from(arrayBuffer);
  // the format for each favicone stored in `SUPPORT_DIR` is `${entry.domain}-${entry.width}w-${entry.height}h.png`
  const faviconPath = path.join(SUPPORT_DIR, `${entry.domain}-${entry.width}w-${entry.height}h.png`);

  // only write to `faviconePath` if it doesn't exists (to prevent duplicates)
  if (!fs.existsSync(faviconPath)) {
    // it its not a rectangle (width == height) or width and height is >= 256, the image needs to be adjusted using `Jimp`
    if (!isARectangle || !isLessMax) {
      // make `Jimp` manipulate the bytes of `faviconPngData` before storing it using `Jimp.write`
      const favicon = await Jimp.read(faviconPngData.buffer);
      favicon.resize({
        w: Number(entry.width),
        h: Number(entry.height),
      });
      await favicon.write(faviconPath as `${string}.${string}`);
      return;
    }
    await fsp.writeFile(faviconPath, faviconPngData, { flag: "w+" });
  }
}
