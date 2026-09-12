import OpenAI from "openai";

import { apiKey, prompt } from "../types/preferences";
import { getBase64Url } from "./getBase64URL";

export type LocalImage = { path: string; isLocalImagePath: true };
export type RemoteImage = { url: string; isLocalImagePath: false };
export type Image = LocalImage | RemoteImage;

export const generateDescription = async (image: Image) => {
  // Get the OpenAI client
  const openAIClient = new OpenAI({ apiKey: apiKey });

  if (!openAIClient) {
    throw new Error("Failed to initialize OpenAI client");
  }

  // Send a request to OpenAI to interpret image

  const openAIResponse = await openAIClient.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: image.isLocalImagePath ? await getBase64Url(image.path) : image.url,
            },
          },
        ],
      },
    ],
  });

  const description = openAIResponse?.choices?.[0]?.message?.content || null;
  if (!description) {
    throw new Error("Failed to generate description");
  }

  return description;
};
