import fetch, { Response } from "node-fetch";
import { ImgflipCaptionImageResponse, ImgflipGetMemesResponse } from "./types";
import { getPreferenceValues, PreferenceValues } from "@raycast/api";
import { URL } from "url";
import { ApiModule, Meme } from "../types";
import { withCache } from "@raycast/utils";

const DEFAULT_IMGFLIP_USERNAME = "raycastapi";
const DEFAULT_IMGFLIP_PASSWORD = "E4Ls@m*wk3U1";

interface GetMemesResult {
  success: true;
  memes: Meme[];
}

const TEMPLATES_URL = "https://api.imgflip.com/get_memes";

async function parseTemplates(response: Response | globalThis.Response): Promise<Meme[]> {
  const json = (await response.json()) as ImgflipGetMemesResponse;

  if (!json.success) {
    throw new Error(json.error_message || "Failed to fetch templates from Imgflip");
  }

  return json.data.memes.map((meme) => ({
    id: meme.id,
    title: meme.name,
    url: meme.url,
    boxCount: meme.box_count,
  }));
}

async function fetchMemes(): Promise<GetMemesResult> {
  try {
    const response = await fetch(TEMPLATES_URL);
    const memes = await parseTemplates(response);
    return { success: true, memes };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "An unexpected network error occurred.");
  }
}

const getMemes = withCache(fetchMemes, {
  maxAge: 24 * 60 * 60 * 1000, // Cache for 24 hours
});

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

export const imgflipApi: ApiModule = {
  templatesUrl: TEMPLATES_URL,
  parseTemplates,
  getMemes,
  generateMeme,
};
