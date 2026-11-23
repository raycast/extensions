import { Chat, Message } from "../type";
import path from "node:path";
import { MAX_INLINE_IMAGE_BYTES, readLocalImage } from "./local-image";
import OpenAI from "openai/index";

type ChatCompletionContentPart = OpenAI.ChatCompletionContentPart;

export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(({ id }) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

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

  // Keep the newest turns when the conversation exceeds the context budget.
  for (let i = chats.length - 1; i >= 0; i--) {
    const chat = chats[i];
    const questionTokens = countOpenAITokens(chat.question);
    const answerTokens = countOpenAITokens(chat.answer);

    tokens = tokens + questionTokens + answerTokens;

    if (tokens > maxTokens && newChats.length > 0) {
      break;
    }

    newChats.unshift(chat);
  }

  return newChats;
}

export function chatTransformer(chat: Chat[], prompt: string): Message[] {
  const messages: Message[] = [];
  if (prompt !== "") {
    // only add system prompt if it's not empty
    messages.push({ role: "system", content: prompt });
  }
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

export const checkFileValidity = (file: string): boolean => {
  const fileExtension = path.extname(file);
  const acceptedFileExtensions = Object.keys(formats);
  return acceptedFileExtensions.includes(fileExtension);
};

// https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types
export const formats: { [K: string]: string } = {
  ".png": "image/png",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export const buildUserMessage = async (question: string, files?: string[]) => {
  if (!files || files.length === 0) {
    // If there is no file, return the question string directly
    return question;
  }

  // If there are files, create an array
  const content: ChatCompletionContentPart[] = [
    {
      type: "text",
      text: question,
    },
  ];

  let remaining = MAX_INLINE_IMAGE_BYTES;
  for (const image of files) {
    const { data, path: localPath } = await readLocalImage(image, remaining);
    remaining -= data.length;
    const type = formats[path.extname(localPath).toLowerCase()] ?? formats[".png"];
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${type};base64,${data.toString("base64")}`,
      },
    });
  }

  return content;
};

export const toUnit = (size: number) => {
  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let unitIndex = 0;
  let unit = units[unitIndex];
  while (size >= 1024) {
    size /= 1024;
    unitIndex++;
    unit = units[unitIndex];
  }
  return `${size.toFixed(2)} ${unit}`;
};
