import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { FormEntry } from "../types/types";
import { SUPPORT_DIR } from "./consts";
import isValidDomain from "is-valid-domain";

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

/** Adds a favicon to `DB_PATH`  */
export async function addFaviconeToSupportDir(entry: FormEntry) {
  // url to fetch favicon data.
  const url = `https://favicone.com/${entry.domain}?s=${entry.size}`;
  // performing a get request from `url` returns a png image
  const response = await fetch(url);
  // turn the body of the response into an array of bytes that represents the bytes to construct a png
  const faviconPngData = await response.bytes();
  // the format for each favicone stored in `SUPPORT_DIR` is `${entry.domain}-${entry.size}.png`
  const faviconPath = path.join(SUPPORT_DIR, `${entry.domain}-${entry.size}.png`);
  // only write to `faviconePath` if it doesn't exists (to prevent duplicates)
  if (!fs.existsSync(faviconPath)) {
    await fsp.writeFile(faviconPath, faviconPngData, { flag: "w+" });
  }
}
