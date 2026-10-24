/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import fs from "fs";
import mime from "mime-types";
import { tmpdir } from "os";
import { getCachedImagePath, setCachedImagePath } from "./cache";
import { DOWNLOAD_TIMEOUT, HEADERS, ImageLayouts, ImageLicenses, MAX_DOWNLOAD_SIZE } from "./consts";
import { DuckDuckGoImage, imageNextSearch, imageSearch, ImageSearchResult } from "./search";

import { Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import path from "path";

export const emptyResult: ImageSearchResult = {
  vqd: "",
  results: [],
};

export interface ImageSearchCursor {
  next: string;
  vqd: string;
  seenImageTokens: string[];
  seenPageCursors: string[];
}

interface SearchImageParams {
  query: string;
  cursor?: ImageSearchCursor;
  signal?: AbortSignal;
  layout?: ImageLayouts;
}

export async function searchImage({ query, cursor, signal, layout }: SearchImageParams): Promise<ImageSearchResult> {
  if (!query) {
    return emptyResult;
  }

  const { moderate, locale, license } = getPreferenceValues<Preferences.SearchImage>();

  try {
    if (cursor) {
      return await imageNextSearch(cursor.next, cursor.vqd, signal);
    }
    return await imageSearch(
      query,
      {
        moderate,
        filters: { layout, license: license as ImageLicenses },
        locale,
      },
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
  const url = new URL(image);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("This image uses an unsupported URL.");
  }

  const response = await axios.get(url.toString(), {
    headers: HEADERS,
    responseType: "arraybuffer",
    timeout: DOWNLOAD_TIMEOUT,
    maxContentLength: MAX_DOWNLOAD_SIZE,
    maxBodyLength: MAX_DOWNLOAD_SIZE,
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
  const extension = typeof contentType === "string" ? mime.extension(contentType) : false;

  filePath = path.join(tmpdir(), image_token + (extension ? `.${extension}` : ""));

  await fs.promises.writeFile(filePath, response.data);
  setCachedImagePath(image_token, filePath);

  if (showToastMessage) {
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
    return false;
  }
  await showToast({
    title: "Image Copied!",
    style: Toast.Style.Success,
  });
  return true;
}

export async function pasteImage(image: DuckDuckGoImage) {
  try {
    const file = await downloadImage(image);
    await Clipboard.paste({ file });
    return true;
  } catch (error) {
    await showToast({
      title: "Failed to Paste Image",
      message: getErrorMessage(error),
      style: Toast.Style.Failure,
    });
    return false;
  }
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
    // Download the image to the temp folder first
    const tempFile = await downloadImage(image, false);

    // Create a clean filename from the image title
    const cleanTitle = image.title
      .replace(/[^a-zA-Z0-9\s\-_.]/g, "") // Remove special characters
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .substring(0, 100); // Limit filename length

    // Get file extension from a temp file
    const extension = path.extname(tempFile);
    const filename = `${cleanTitle || "duckduckgo_image"}_${image.image_token}${extension}`;

    // Get save directory from preferences (with fallback to ~/Downloads)
    const allPreferences = getPreferenceValues<Preferences>();
    const saveDirectory = expandTildePath(allPreferences.saveDirectory || "~/Downloads");
    if (!saveDirectory) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error("Save directory is not set");
    }

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
  }
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return "The image server timed out.";
    if (error.response?.status) return `The image server returned HTTP ${error.response.status}.`;
    return "Could not connect to the image server.";
  }
  return error instanceof Error ? error.message : "Unexpected error.";
}
