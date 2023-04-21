import { accessToken } from "./preferences";
import { Toast, showToast, LocalStorage } from "@raycast/api";
import {
  Models,
  ModelFormParams,
  GPTModelParams,
  DALLEModelParams,
  ResponseType,
  StorageValue,
  RemovePropertyResult,
  CustomPrompt,
} from "./types";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import os from "os";

export const MODELS: Models = {
  gpt: {
    link: "https://api.openai.com/v1/chat/completions",
    model: "gpt-3.5-turbo",
    name: "GPT-3",
  },
  dalle: {
    link: "https://api.openai.com/v1/images/generations",
    name: "DALL-E",
  },
};

export const getRequestBody = (params: ModelFormParams) => {
  let body: GPTModelParams | DALLEModelParams = {};
  if (params?.model === "gpt") {
    body = {
      model: MODELS[params?.model]?.model,
      messages: [
        {
          role: "user",
          content: params?.prompt ?? "",
        },
      ],
      temperature: parseInt(String(params?.temperature)) ?? 1,
      n: parseInt(String(params?.n)) ?? 1,
      presence_penalty: parseInt(String(params?.presencePenalty)) ?? 0,
      frequency_penalty: parseInt(String(params?.frequencyPenalty)) ?? 0,
    };
    if (params?.role !== "none") body?.messages?.unshift({ role: "system", content: params?.role as string });
  } else if (params?.model === "dalle") {
    body = {
      prompt: params?.prompt ?? "",
      n: parseInt(String(params?.n)) ?? 1,
      size: params?.size !== "" ? params?.size : "1024x1024",
    };
  }
  return body;
};

export const parseNbr = (e: string): number => {
  const num = parseInt(e, 10);
  return isNaN(num) ? 0 : num;
};

export async function sendPrompt(params: ModelFormParams) {
  const URL = MODELS[params?.model as string]?.link;
  const body = getRequestBody(params);
  try {
    const result = await fetch(URL, {
      method: "post",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });

    const data: ResponseType = (await result.json()) as ResponseType;
    return data;
  } catch (error) {
    console.error(error);
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
}

export const fetchImageFromURL = async (imageUrl: string) => {
  try {
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const extension = imageUrl.substring(imageUrl.lastIndexOf(".") + 1).split(/[?#]/)[0];
    const fileName = `promptify-generated.${extension}`;
    const filePath = path.join(os.homedir(), "Downloads", fileName);
    fs.writeFileSync(filePath, Buffer.from(buffer), "utf-8");
    showToast(Toast.Style.Success, "Downloaded successfully");
  } catch (error) {
    console.error(error);
    await showToast(Toast.Style.Failure, "Couldn't download the image");
  }
};

export const getStorageCount = async (prompt?: boolean) => {
  const storage = await LocalStorage.allItems();
  const { storedHistory, customPrompts } = removeObjectProperty(storage, "custom-prompts");
  if (prompt && customPrompts) return Object.values(JSON.parse(customPrompts))?.length;
  else if (prompt && customPrompts === undefined) {
    return 0;
  }
  return Object.keys(storedHistory)?.length;
};

export const fetchStorage = async (prompts?: boolean) => {
  const storage: StorageValue = await LocalStorage.allItems();
  const { storedHistory, customPrompts } = removeObjectProperty(storage, "custom-prompts");
  if (prompts) return JSON.parse(customPrompts);
  return sortObject(storedHistory as StorageValue);
};

export const setStorage = async (key: string, value: string) => {
  await LocalStorage.setItem(key, value);
};

export const updateStoredPrompts = async (newPrompt: { [key: string]: CustomPrompt }) => {
  const storedDataString = await LocalStorage.getItem("custom-prompts");
  let storedData: {
    [key: string]: string;
  } = {};
  if (storedDataString) {
    storedData = JSON.parse(storedDataString as string);
  } else {
    storedData = {};
  }
  const updatedData = { ...storedData, ...newPrompt };
  await LocalStorage.setItem("custom-prompts", JSON.stringify(updatedData));
  showToast(Toast.Style.Success, "Prompt saved!");
};

export const clearStorage = async (property?: string) => {
  const storage = await LocalStorage.allItems();
  const { storedHistory, customPrompts } = removeObjectProperty(storage, "custom-prompts");
  if (property) {
    const newPrompts = { ...JSON.parse(customPrompts) };
    delete newPrompts[property];
    await setStorage("custom-prompts", JSON.stringify(newPrompts));
  } else {
    await LocalStorage.clear();
    await setStorage("custom-prompts", customPrompts);
  }
  showToast(Toast.Style.Success, "Deleted!");
};

export const sortObject = (object: { [key: string]: string }) => {
  return Object.fromEntries(
    Object.entries(object).sort(([aKey, aVal], [bKey, bVal]) => {
      const aParsed = JSON.parse(aVal);
      const bParsed = JSON.parse(bVal);
      if (!aParsed || !bParsed || !aParsed.index || !bParsed.index) {
        return 0;
      }
      return bParsed.index - aParsed.index;
    })
  );
};

export const removeObjectProperty = <T extends object>(obj: T, propName: keyof T): RemovePropertyResult<T> => {
  const { [propName]: customPrompts, ...rest } = obj;
  return {
    storedHistory: rest as Partial<T>,
    customPrompts,
  };
};
