/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DuckDuckGoImage,
  imageNextSearch,
  imageSearch,
  ImageSearchResult,
} from "../utils/search";
import { HEADERS, ImageLayout, MAX_RETRIES } from "../utils/consts";
import { getCachedImagePath, setCachedImagePath } from "../utils/cache";
import axios from "axios";
import { tmpdir } from "os";
import fs from "fs";
import mime from "mime-types";

import path from "path";
import { getPreferenceValues, showToast, Toast, Clipboard } from "@raycast/api";

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
  layout?: ImageLayout;
}

export async function searchImage({
  query,
  cursor,
  signal,
  layout,
}: SearchImageParams): Promise<ImageSearchResult> {
  const { moderate } = getPreferenceValues<Preferences.SearchImage>();

  if (!query) {
    return emptyResult;
  }
  try {
    if (cursor) {
      return await imageNextSearch(
        cursor.next,
        cursor.vqd,
        MAX_RETRIES,
        signal,
      );
    }
    return await imageSearch(
      query,
      { moderate, filters: { layout } },
      MAX_RETRIES,
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
      return "";
    }
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  // Get the correct file extension from the response's Content-Type header
  const contentType = response.headers["content-type"];
  const extension = mime.extension(contentType);

  filePath = path.join(
    tmpdir(),
    image_token + (extension ? `.${extension}` : ""),
  );

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
