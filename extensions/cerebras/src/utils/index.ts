import { Chat, Message } from "../type";
import path from "node:path";
import * as fs from "node:fs";
import OpenAI from "openai/index";

type ChatCompletionContentPart = OpenAI.ChatCompletionContentPart;

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

export const imgFormat = (file: string) => {
  const fileExtension = path.extname(file);
  let type = formats[fileExtension];
  if (!type) {
    // guess it from the clipboard
    type = formats[".png"];
  }
  // file:///var/folders/vx/xs9f3rcj74d2wlp32sz0t0h80000gn/T/Image%20(1772x1172)
  const replace = file.replace("file://", "").replace("%20", " ");
  // data:image/jpeg;base64,{base64_image}
  return `data:${type};base64,${fs.readFileSync(replace).toString("base64")}`;
};

export const buildUserMessage = (question: string, files?: string[]) => {
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

  files.forEach((img) => {
    content.push({
      type: "image_url",
      image_url: {
        // Format images to base64
        url: imgFormat(img),
      },
    });
  });

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
