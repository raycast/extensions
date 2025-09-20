import fetch from "node-fetch";
import { ImgflipCaptionImageResponse, ImgflipGetMemesResponse } from "./types";
import { Meme } from "../types";
import { getPreferenceValues, LocalStorage, PreferenceValues } from "@raycast/api";
import { URL } from "url";

const DEFAULT_IMGFLIP_USERNAME = "raycastapi";
const DEFAULT_IMGFLIP_PASSWORD = "E4Ls@m*wk3U1";

interface GetMemesResult {
  success: true;
  memes: Meme[];
}

function cacheIsExpired(cacheTime: number): boolean {
  const day = 1000 * 60 * 60 * 24;
  return cacheTime < Date.now() - day;
}

async function getMemeResultsFromCache(): Promise<Meme[] | null> {
  const memeCacheTime = await LocalStorage.getItem("meme-cache-time");
  const memeCache = await LocalStorage.getItem("meme-cache");
  if (!memeCacheTime || !memeCache || cacheIsExpired(memeCacheTime as number)) {
    return null;
  }
  return JSON.parse(memeCache as string);
}

async function setMemeResultsCache(memes: Meme[]) {
  await LocalStorage.setItem("meme-cache-time", Date.now());
  await LocalStorage.setItem("meme-cache", JSON.stringify(memes));
}

export async function getMemes(): Promise<GetMemesResult> {
  // Try cache first
  const memesFromCache = await getMemeResultsFromCache();
  if (memesFromCache) {
    console.log("getMemes: Returning cached results.");
    return { success: true, memes: memesFromCache };
  }
  console.log("getMemes: Cache miss or expired, fetching from API.");

  try {
    const response = await fetch("https://api.imgflip.com/get_memes");
    const data = (await response.json()) as ImgflipGetMemesResponse;

    if (!data.success) {
      throw {
        success: false,
        message: data.error_message,
      };
    }

    const memes = data.data.memes.map(({ id, name, url, box_count: boxCount }) => ({
      id,
      title: name,
      url,
      boxCount,
    }));

    setMemeResultsCache(memes); // Update cache
    console.log(`getMemes: Fetched ${memes.length} memes from API.`);
    return {
      success: true,
      memes,
    };
  } catch (error) {
    // Add type check for error message
    let message = "An unexpected network error occurred.";
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      message = error.message;
    }
    console.error("getMemes: Error fetching from API:", message);
    throw {
      success: false,
      message: message,
    };
  }
}

interface GenerateMemeInput {
  id: string;
  boxes: { text: string }[];
}

interface GenerateMemeResult {
  success: true;
  url: string;
}

export async function generateMeme({ id, boxes }: GenerateMemeInput): Promise<GenerateMemeResult> {
  const preferences = getPreferenceValues<PreferenceValues>();
  try {
    const url = new URL("https://api.imgflip.com/caption_image");
    url.searchParams.set("template_id", id);
    url.searchParams.set("username", preferences.username || DEFAULT_IMGFLIP_USERNAME);
    url.searchParams.set("password", preferences.password || DEFAULT_IMGFLIP_PASSWORD);

    boxes.forEach(({ text }, index) => {
      url.searchParams.set(`boxes[${index}][text]`, text);
    });

    const response = await fetch(url.toString(), {
      method: "POST",
    });
    const data = (await response.json()) as ImgflipCaptionImageResponse;

    if (!data.success) {
      throw {
        success: false,
        message: data.error_message,
      };
    }

    return {
      success: true,
      url: data.data.url,
    };
  } catch {
    throw {
      success: false,
      message: "An unexpected network error occurred.",
    };
  }
}
