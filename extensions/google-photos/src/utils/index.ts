import { homedir } from "os";
import { join } from "path";
import { Icon, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { readFile, writeFile } from "fs/promises";
import { getOAuthToken } from "../components/withGoogleAuth";

export const downloadMedia = async (url: string, filename: string, mimeType: string) => {
  const type = mimeType.split("/")[0];
  const path = join(homedir(), "Downloads", filename);

  showToast(Toast.Style.Animated, `Downloading ${type}...`);

  switch (type) {
    case "image":
      await fetch(`${url}=d`)
        .then((res) => res.arrayBuffer())
        .then((buffer) => writeFile(path, Buffer.from(buffer)));
      break;
    case "video":
      await fetch(`${url}=dv`)
        .then((res) => res.arrayBuffer())
        .then((buffer) => writeFile(path, Buffer.from(buffer)));
      break;
    default:
      showToast(Toast.Style.Failure, `Unable to download ${type}`);
  }

  showToast(Toast.Style.Success, `Downloaded ${filename}`);
};

export const isEmpty = (obj: unknown) => {
  return Object.keys(obj as { [key: string]: unknown }).length === 0;
};

export const sorts = [
  { id: "all", name: "All", value: "ALL_MEDIA", icon: Icon.House },
  { id: "photos", name: "Photos", value: "PHOTO", icon: Icon.Image },
  { id: "videos", name: "Videos", value: "VIDEO", icon: Icon.Video },
];

export const categories = [
  { id: "animals", name: "Animals", value: "ANIMALS" },
  { id: "fashion", name: "Fashion", value: "FASHION" },
  { id: "landmarks", name: "Landmarks", value: "LANDMARKS" },
  { id: "receipts", name: "Receipts", value: "RECEIPTS" },
  { id: "weddings", name: "Weddings", value: "WEDDINGS" },
  { id: "arts", name: "Arts", value: "ARTS" },
  { id: "flowers", name: "Flowers", value: "FLOWERS" },
  { id: "landscapes", name: "Landscapes", value: "LANDSCAPES" },
  { id: "screenshots", name: "Screenshots", value: "SCREENSHOTS" },
  { id: "whiteboards", name: "Whiteboards", value: "WHITEBOARDS" },
  { id: "birthdays", name: "Birthdays", value: "BIRTHDAYS" },
  { id: "food", name: "Food", value: "FOOD" },
  { id: "night", name: "Night", value: "NIGHT" },
  { id: "selfies", name: "Selfies", value: "SELFIES" },
  { id: "cityscapes", name: "Cityscapes", value: "CITYSCAPES" },
  { id: "gardens", name: "Gardens", value: "GARDENS" },
  { id: "people", name: "People", value: "PEOPLE" },
  { id: "sport", name: "Sport", value: "SPORT" },
  { id: "crafts", name: "Crafts", value: "CRAFTS" },
  { id: "holidays", name: "Holidays", value: "HOLIDAYS" },
  { id: "performances", name: "Performances", value: "PERFORMANCES" },
  { id: "travel", name: "Travel", value: "TRAVEL" },
  { id: "documents", name: "Documents", value: "DOCUMENTS" },
  { id: "houses", name: "Houses", value: "HOUSES" },
  { id: "pets", name: "Pets", value: "PETS" },
  { id: "utility", name: "Utility", value: "UTILITY" },
];

export const validMediaTypes = [
  "bmp",
  "gif",
  "heic",
  "ico",
  "jpg",
  "png",
  "tiff",
  "webp",
  "3gp",
  "3g2",
  "asf",
  "avi",
  "divx",
  "m2t",
  "m2ts",
  "m4v",
  "mkv",
  "mmv",
  "mod",
  "mov",
  "mp4",
  "mpg",
  "mts",
  "tod",
  "wmv",
];

export const GetToken = async (path: string) => {
  try {
    const file = await readFile(path);

    const response = await fetch("https://photoslibrary.googleapis.com/v1/uploads", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOAuthToken()}`,
        "Content-type": "application/octet-stream",
        "X-Goog-Upload-Content-Type": "image/png",
        "X-Goog-Upload-Protocol": "raw",
      },
      body: file,
    }).then((res) => res.text());

    return response;
  } catch (error) {
    console.error(error);
  }
};

export const createMediaItem = async (tokens: string[]) => {
  try {
    const response = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOAuthToken()}`,
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        newMediaItems: tokens.map((token) => ({
          description: "Uploaded from Raycast",
          simpleMediaItem: {
            uploadToken: token,
          },
        })),
      }),
    });

    return response.json();
  } catch (error) {
    console.error(error);
  }
};
