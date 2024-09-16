import OpenAI from "openai";
import axios from "axios";
import { load } from "cheerio";
import { getPreferenceValues } from "@raycast/api";
import { getLocalizedStrings } from "./i18n";

interface Preferences {
  model: string;
  apiKey: string;
  baseURL: string;
}

let openai: OpenAI | null = null;

export function initializeOpenAI() {
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.model && preferences.apiKey && preferences.baseURL) {
    openai = new OpenAI({
      baseURL: preferences.baseURL,
      apiKey: preferences.apiKey,
    });
  }

  return { model: preferences.model, preferences };
}

export async function validateModel(): Promise<boolean> {
  const { model } = initializeOpenAI();
  if (!model || !openai) return true;

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: "Hello" }],
    });

    return response.choices.length > 0;
  } catch (error) {
    console.error("Model validation failed:", error);
    return false;
  }
}

async function getWebsiteInfo(url: string): Promise<{ title: string; description: string }> {
  try {
    const response = await axios.get(url);
    const $ = load(response.data, { xml: true });
    const title = $("title").text().trim() || "";
    const description = $('meta[name="description"]').attr("content") || "";
    return { title, description };
  } catch (error) {
    console.error("Error fetching website info:", error);
    return { title: "", description: "" };
  }
}

export async function generateClipTitleAndTags(url: string): Promise<{ title: string; tags: string[] }> {
  const { model } = initializeOpenAI();
  const { title, description } = await getWebsiteInfo(url);
  const { generateTag } = getLocalizedStrings();
  if (!model || !openai) {
    return {
      title: title || url,
      tags: description ? [description] : [],
    };
  }

  const response = await openai.chat.completions.create({
    model: model,
    messages: [
      {
        role: "system",
        content:
          "You are an AI assistant specialized in generating concise titles and relevant resource type tags for URLs. Focus on categorizing the content type and format. If no content is available, summarize the URL itself.",
      },
      {
        role: "user",
        content: `Generate a concise title and 2-5 relevant tags for this URL: ${url}
          Website title: ${title}
          Website description: ${description}
          Tags should focus on resource types such as: ${generateTag}
          If the URL is a Twitter/X post, extract the main topic or theme of the tweet. Use 'tweet' as one of the tags and focus on the content type (e.g., news, opinion, announcement, etc.).
          If no content is available, summarize the URL itself.
          Respond in JSON format with 'title' and 'tags' keys.`,
      },
    ],
  });

  const content = response.choices[0].message.content;

  if (content) {
    const { title, tags } = JSON.parse(content.replaceAll("```json", "").replaceAll("```", "").trim());
    return { title, tags };
  } else {
    throw new Error("Failed to generate title and tags");
  }
}
