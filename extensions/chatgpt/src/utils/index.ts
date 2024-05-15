import { Chat, Message } from "../type";
import path from "node:path";
import * as fs from "node:fs";
import OpenAI from "openai/index";
import ChatCompletionContentPart = OpenAI.ChatCompletionContentPart;

function countOpenAITokens(text: string): number {
  // 100 tokens ~= 75 words
  const words = text.split(" ").length;
  return Math.ceil(words / 75) * 100;
}

function limitConversationLength(chats: Chat[]) {
  // https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
  const maxTokens = 3750;
  const newChats: Chat[] = [];
  let tokens = 0;

  for (const chat of chats) {
    const questionTokens = countOpenAITokens(chat.question);
    const answerTokens = countOpenAITokens(chat.answer);

    tokens = tokens + questionTokens + answerTokens;

    if (tokens > maxTokens) {
      break;
    }

    newChats.push(chat);
  }

  return newChats;
}

export function chatTransformer(chat: Chat[], prompt: string): Message[] {
  const messages: Message[] = [{ role: "system", content: prompt }];
  const limitedChat = limitConversationLength(chat);
  limitedChat.forEach(({ question, answer }) => {
    messages.push({ role: "user", content: question });
    messages.push({
      role: "assistant",
      content: answer,
    });
  });
  return messages;
}

export const getConfigUrl = (params: Preferences) => {
  if (params.useAzure) return params.azureEndpoint + "/openai/deployments/" + params.azureDeployment;
  if (params.useApiEndpoint) return params.apiEndpoint;
  return "https://api.openai.com/v1";
};

export const checkFileValidity = (file: string) => {
  const fileExtension = path.extname(file);
  const acceptedFileExtensions = Object.keys(formats);
  if (!acceptedFileExtensions.includes(fileExtension)) {
    throw new Error(`${fileExtension} is not a valid file type!`);
  }
};

// https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types
const formats: { [K: string]: string } = {
  ".png": "image/png",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export const imgFormat = (file: string) => {
  const fileExtension = path.extname(file);
  const type = formats[fileExtension];
  if (!type) {
    // should never happen
    throw new Error(`Image format not supported for ${file}`);
  }
  // data:image/jpeg;base64,{base64_image}
  return `data:${type};base64,${fs.readFileSync(file).toString("base64")}`;
};

export const buildUserMessage = (question: string, base64Images: string[]) => {
  const content: ChatCompletionContentPart[] = [
    {
      type: "text",
      text: question,
    },
  ];

  base64Images.forEach((img) => {
    content.push({
      type: "image_url",
      image_url: {
        url: img,
      },
    });
  });
  return content;
};
