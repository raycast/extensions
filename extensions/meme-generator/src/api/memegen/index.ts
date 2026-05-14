import fetch, { Response } from "node-fetch";
import { MemegenTemplatesResponse } from "./types";
import { ApiModule, Meme } from "../types";
import { withCache } from "@raycast/utils";

interface GetMemesResult {
  success: true;
  memes: Meme[];
}

const TEMPLATES_URL = "https://api.memegen.link/templates/";

async function parseTemplates(response: Response | globalThis.Response): Promise<Meme[]> {
  const json = (await response.json()) as MemegenTemplatesResponse;

  if (!Array.isArray(json)) {
    throw new Error("Invalid response format from Memegen API");
  }

  return json.map((template) => ({
    id: template.id,
    title: template.name,
    url: template.example.url,
    boxCount: template.lines,
  }));
}

async function fetchMemes(): Promise<GetMemesResult> {
  try {
    const response = await fetch(TEMPLATES_URL);
    const memes = await parseTemplates(response);
    return { success: true, memes };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to fetch templates from memegen API");
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

/**
 * Escapes text for use in memegen URLs according to their special character rules
 */
function escapeTextForUrl(text: string): string {
  return text
    .replace(/_/g, "__") // Underscore → double underscore (must be first)
    .replace(/-/g, "--") // Dash → double dash
    .replace(/ /g, "_") // Space → underscore
    .replace(/\?/g, "~q") // Question mark
    .replace(/&/g, "~a") // Ampersand
    .replace(/%/g, "~p") // Percentage
    .replace(/#/g, "~h") // Hashtag
    .replace(/\//g, "~s") // Slash
    .replace(/\\/g, "~b") // Backslash
    .replace(/</g, "~l") // Less-than
    .replace(/>/g, "~g") // Greater-than
    .replace(/"/g, "''"); // Double quote → two single quotes
}

export async function generateMeme({ id, boxes }: GenerateMemeInput): Promise<GenerateMemeResult> {
  try {
    // Escape text for each box
    const escapedTexts = boxes.map((box) => escapeTextForUrl(box.text || "_"));

    // Build the URL path: /images/{template_id}/{text1}/{text2}/...
    const textsPath = escapedTexts.join("/");
    const url = `https://api.memegen.link/images/${id}/${textsPath}.png`;

    // Memegen generates images via GET request - the URL itself is the image
    // We just need to verify it's accessible
    const response = await fetch(url, { method: "HEAD" });

    if (!response.ok) {
      throw {
        success: false,
        message: `Failed to generate meme: ${response.statusText}`,
      };
    }

    return {
      success: true,
      url: url,
    };
  } catch (error) {
    let message = "Failed to generate meme";
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      message = error.message;
    }
    throw {
      success: false,
      message: message,
    };
  }
}

export const memegenApi: ApiModule = {
  templatesUrl: TEMPLATES_URL,
  parseTemplates,
  getMemes,
  generateMeme,
};
