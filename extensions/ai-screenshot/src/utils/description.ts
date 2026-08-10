import fs from "fs";
import { AuthenticationError, OpenAI } from "openai";
import { ChatCompletion, ChatCompletionMessageParam } from "openai/resources";
import config = require("../config/modification.json");

export async function describeImage(client: OpenAI, imagePath: string): Promise<string> {
  const imageBytes = fs.readFileSync(imagePath, { encoding: "base64" });
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: config.description.descriptor_system_prompt,
    },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: `data:image/png;base64,${imageBytes}` },
        },
        {
          type: "text",
          text: config.description.user_command,
        },
      ],
    },
  ];
  let completion: ChatCompletion;
  try {
    completion = await client.chat.completions.create({
      model: config.description.model,
      messages: messages,
      max_tokens: config.description.max_tokens,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw new Error("Failed to authenticate with OpenAI. Please check your API key.");
    } else {
      console.error("Failed to describe the image.", error);
      throw new Error("Failed to describe the image.");
    }
  }
  const description = completion.choices[0].message?.content;
  return description ?? "";
}
