/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import fs from "fs";
import mime from "mime-types";
import { tmpdir } from "os";
import { getCachedImagePath, setCachedImagePath } from "./cache";
import { DEFAULT_RETRIES, DEFAULT_SLEEP, HEADERS, ImageLayouts, ImageLicenses } from "./consts";
import { DuckDuckGoImage, imageNextSearch, imageSearch, ImageSearchResult } from "./search";

import { Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import path from "path";

export const emptyResult: ImageSearchResult = {
  vqd: "",
  results: [],
};

interface Cursor {
  next: string;
  vqd: string;
}

interface SearchImageParams {
  query: string;
  cursor?: Cursor;
  signal?: AbortSignal;
  layout?: ImageLayouts;
}

export async function searchImage({ query, cursor, signal, layout }: SearchImageParams): Promise<ImageSearchResult> {
  if (!query) {
    return emptyResult;
  }

  const {
    moderate,
    locale,
    retries: retriesString,
    sleep: sleepString,
    license,
  } = getPreferenceValues<Preferences.SearchImage>();
  const retries = stringToPositiveNumber(retriesString) || DEFAULT_RETRIES;
  const sleep = stringToPositiveNumber(sleepString) || DEFAULT_SLEEP;

  try {
    if (cursor) {
      return await imageNextSearch(cursor.next, cursor.vqd, retries, sleep, signal);
    }
    return await imageSearch(
      query,
      {
        moderate,
        filters: { layout, license: license as ImageLicenses },
        locale,
      },
      retries,
      sleep,
      signal,
    );
  } catch (err: any) {
    console.error(err.message);
    throw err;
  }
}

export async function downloadImage(
  { image, image_token }: DuckDuckGoImage,
  showToastMessage: boolean = true,
): Promise<string> {
  let filePath = getCachedImagePath(image_token);
  if (filePath) {
    return filePath;
  }
  if (showToastMessage) {
    await showToast({
      title: "Downloading Image...",
      style: Toast.Style.Animated,
    });
  }
  const response = await axios.get(image, {
    headers: HEADERS,
    responseType: "arraybuffer",
  });

  if (response.status < 200 || response.status >= 300) {
    if (showToastMessage) {
      await showToast({
        title: "Failed to fetch image!",
        message: response.statusText,
        style: Toast.Style.Failure,
      });
    }
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  // Get the correct file extension from the response's Content-Type header
  const contentType = response.headers["content-type"];
  const extension = mime.extension(contentType);

  filePath = path.join(tmpdir(), image_token + (extension ? `.${extension}` : ""));

  await fs.promises.writeFile(filePath, response.data);
  setCachedImagePath(image_token, filePath);

  if (showToast) {
    await showToast({
      title: "Image Downloaded!",
      style: Toast.Style.Success,
    });
  }
  return filePath;
}

export async function copyImageToClipboard(image: DuckDuckGoImage) {
  await showToast({
    title: "Copying Image...",
    style: Toast.Style.Animated,
  });
  try {
    const file = await downloadImage(image, false);
    await Clipboard.copy({ file });
  } catch (e: any) {
    await showToast({
      title: "Failed to Copy Image!",
      style: Toast.Style.Failure,
      message: e.message,
    });
    return;
  }
  await showToast({
    title: "Image Copied!",
    style: Toast.Style.Success,
  });
}

export async function pasteImage(image: DuckDuckGoImage) {
  const file = await downloadImage(image);
  await Clipboard.paste({ file });
}

function expandTildePath(filePath: string): string {
  if (!filePath) return "";
  if (filePath === "~" || filePath === "~/") return homedir();
  if (filePath.startsWith("~/")) {
    return path.resolve(homedir(), filePath.slice(2));
  }
  return path.resolve(filePath);
}

export async function saveImage(image: DuckDuckGoImage) {
  await showToast({
    title: "Saving Image...",
    style: Toast.Style.Animated,
  });

  try {
    // Download the image to temp folder first
    const tempFile = await downloadImage(image, false);

    // Create a clean filename from the image title
    const cleanTitle = image.title
      .replace(/[^a-zA-Z0-9\s\-_.]/g, "") // Remove special characters
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .substring(0, 100); // Limit filename length

    // Get file extension from temp file
    const extension = path.extname(tempFile);
    const filename = `${cleanTitle || "duckduckgo_image"}_${image.image_token}${extension}`;

    // Get save directory from preferences (with fallback to ~/Downloads)
    const allPreferences = getPreferenceValues<Preferences & { saveDirectory?: string }>();
    const saveDirectory = expandTildePath(allPreferences.saveDirectory || "~/Downloads");

    // Ensure the save directory exists
    await fs.promises.mkdir(saveDirectory, { recursive: true });

    const targetPath = path.join(saveDirectory, filename);

    // Copy file from temp to save directory
    await fs.promises.copyFile(tempFile, targetPath);

    const directoryName = path.basename(saveDirectory);
    await showToast({
      title: "Image Saved!",
      message: `Saved to ${directoryName} folder as ${filename}`,
      style: Toast.Style.Success,
    });

    return targetPath;
  } catch (e: any) {
    await showToast({
      title: "Failed to Save Image!",
      style: Toast.Style.Failure,
      message: e.message,
    });
    throw e;
  }
}

export function stringToPositiveNumber(value: string): number | undefined {
  const parsed = parseInt(value.trim());
  if (isNaN(parsed)) {
    return;
  }
  if (parsed < 1) {
    return;
  }
  return parsed;
}
