import dedent from "dedent";
import OpenAI from "openai";
import { ImagesResponse } from "openai/resources";
import config = require("../config/modification.json");

type imageSize = "1024x1024" | "1792x1024" | "1024x1792";

export async function generateImage(client: OpenAI, prompt: string): Promise<string> {
  let result: ImagesResponse;
  try {
    result = await client.images.generate({
      model: config.generation.model,
      prompt: prompt,
      n: 1,
      size: config.generation.image_size as imageSize,
    });
  } catch (error) {
    console.error("Failed to generate the modified image.", error);
    throw new Error("Failed to generate the modified image");
  }
  const imageUrl = result.data[0].url as string;
  return imageUrl;
}

export function createGenerationPrompt(imageDescription: string, modificationPrompt: string): string {
  const generationPrompt = dedent`
    Task: ${config.generation.generator_task}

    Modifications: ${modificationPrompt},
s
    Description: ${imageDescription},

    ${config.generation.generator_command}
    `;
  return generationPrompt;
}
