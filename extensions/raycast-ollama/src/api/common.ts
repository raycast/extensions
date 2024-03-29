import {
  ChainPreferences,
  ModelType,
  OllamaApiShowModelfile,
  OllamaApiTagsResponseModel,
  RaycastChatMessage,
  RaycastImage,
} from "./types";
import { getSelectedFinderItems, Clipboard, LocalStorage } from "@raycast/api";
import fs from "fs";
import { fileTypeFromBuffer } from "file-type/core";
import fetch from "node-fetch";
import { OllamaApiShow, OllamaApiShowParseModelfile, OllamaApiTags } from "./ollama";
import {
  ErrorOllamaModelNotInstalled,
  ErrorOllamaModelNotMultimodal,
  ErrorRaycastModelNotConfiguredOnLocalStorage,
} from "./errors";

/**
 * Verify Ollama Installed Version.
 * @param {string} installed - Installed version given by '/api/version' route.
 * @param {string} min - Minimum version required.
 * @returns {boolean} Return True if installed version is greater or equal than minimum version.
 */
export function VerifyOllamaVersion(installed: string, min: string): boolean {
  const iv = installed.split(".");
  const mv = min.split(".");
  return !iv.find((value, index) => Number(value) < Number(mv[index]));
}

/**
 * Get Image from web.
 * @param {string} url
 * @returns {RaycastImage}
 */
export async function GetImageFromUrl(url: string): Promise<RaycastImage | undefined> {
  if (!url.match(/(http(s?):)([/|.|\w|\s|-])/g)) throw new Error("Clipboard do not contain file path or web url");

  const image = await fetch(url)
    .then((res) => {
      const contentType = res.headers.get("content-type");
      if (contentType === "image/jpeg" || contentType === "image/png") {
        return res.arrayBuffer();
      } else {
        throw new Error("Only PNG and JPG are supported");
      }
    })
    .then((buffer) => {
      return {
        path: url,
        html: `<img src="${url}" alt="image" height="180" width="auto">`,
        base64: Buffer.from(buffer).toString("base64"),
      } as RaycastImage;
    });

  return image;
}

/**
 * Get Image from disk.
 * @param {string} file
 */
export async function GetImageFromFile(file: string): Promise<RaycastImage> {
  if (!file.match(/(file:)?([/|.|\w|\s|-])/g)) throw new Error("Only PNG and JPG are supported");

  file = file.replace("file://", "");
  const buffer = fs.readFileSync(decodeURI(file));
  const fileType = await fileTypeFromBuffer(buffer);
  if (fileType && (fileType.mime === "image/jpeg" || fileType.mime === "image/png")) {
    return {
      path: file,
      html: `<img src="${file}" alt="image" height="180" width="auto">`,
      base64: buffer.toString("base64"),
    };
  } else {
    throw new Error("Only PNG and JPG are supported");
  }
}

/**
 * Get images from Finder if no file is selected fallback to Clipboard.
 * @returns {RaycastImage[]}
 */
export async function GetImage(): Promise<RaycastImage[]> {
  const image: RaycastImage[] = [];
  const finder = await getSelectedFinderItems().catch(() => []);
  if (finder.length > 0) {
    const p = finder.map(async (f) => {
      return GetImageFromFile(f.path).catch(() => {
        return undefined;
      });
    });
    const i = await Promise.all(p);
    i.forEach((i) => {
      if (i) image.push(i);
    });
  } else {
    const clip = await Clipboard.read();
    if (clip.file) {
      const i = await GetImageFromFile(clip.file);
      if (i) image.push(i);
    } else if (clip.text) {
      const i = await GetImageFromUrl(clip.text);
      if (i) image.push(i);
    }
  }
  return image;
}

/**
 * If `model` is undefined get model from LocalStorage.
 * @param {string | undefined} command - Command name.
 * @param {boolean | undefined} image - True if a multimodal model is necessary.
 * @param {string | undefined} model - Model used for inference.
 * @param {ModelType} type - Model Type.
 * @returns {Promise<OllamaApiShowResponse>} Model.
 */
export async function GetModel(
  command: string | undefined,
  image: boolean | undefined,
  model: string | undefined,
  type: ModelType
): Promise<OllamaApiTagsResponseModel> {
  const tags = await OllamaApiTags();
  if (!model) {
    model = await LocalStorage.getItem(`${command}_model_${type}`);
    if (!model) {
      throw ErrorRaycastModelNotConfiguredOnLocalStorage;
    }
  }
  const m = tags.models.find((t) => t.name === model);
  if (!m) throw new ErrorOllamaModelNotInstalled("Model not installed", model);
  if (image && !m.details.families.find((f) => f === "clip")) {
    throw new ErrorOllamaModelNotMultimodal("Model not multimodal", model);
  }
  return m;
}

/**
 * Get Model Modelfile parameters.
 * @param {string} model.
 * @returns {OllamaApiShowModelfile | undefined} Modelfile parameters.
 */
export async function GetModelModelfile(model: string): Promise<OllamaApiShowModelfile | undefined> {
  return await OllamaApiShow(model)
    .then((data) => OllamaApiShowParseModelfile(data))
    .catch(() => undefined);
}

/**
 * Get Chain Preferences.
 * @returns {Promise<ChainSettings | undefined>} Chain Settings.
 */
export async function GetChainPreferences(): Promise<ChainPreferences | undefined> {
  const json = await LocalStorage.getItem(`chain_settings`);
  if (json) {
    return JSON.parse(json as string) as ChainPreferences;
  }
}

/**
 * Get Last Chat used from LocalStorage.
 * @returns {Promise<string>} Chat Name
 */
export async function GetChatName(): Promise<string> {
  const name = await LocalStorage.getItem("chat_name");
  const chat = await GetChatHistoryKeys();
  if (name && chat.find((c) => c === name)) {
    return name as string;
  } else {
    await LocalStorage.setItem("chat_name", "Current");
    return "Current";
  }
}

/**
 * Get Chat History from LocalStorage.
 * @param {string} chat - Chat Name.
 * @returns {Promise<RaycastChatMessage[]> | undefined} Chat History.
 */
export async function GetChatHistory(chat: string): Promise<RaycastChatMessage[]> {
  const json = await LocalStorage.getItem("chat_history");
  if (json) {
    const history: Map<string, RaycastChatMessage[]> = new Map(JSON.parse(json as string));
    if (history.has(chat)) return history.get(chat) as RaycastChatMessage[];
  }
  return [];
}

/**
 * Save Chat History to LocalStorage.
 * @param {string} chat - Chat Name.
 * @param {RaycastChatMessage[]} messages - Chat History.
 */
export async function SaveChatToHistory(chat: string, messages: RaycastChatMessage[], isNew = false): Promise<void> {
  let history: Map<string, RaycastChatMessage[]> = new Map();
  const json = await LocalStorage.getItem("chat_history");
  if (json) history = new Map(JSON.parse(json as string));
  history.set(chat, messages);
  if (isNew) history.set("Current", []);
  await LocalStorage.setItem("chat_history", JSON.stringify([...history]));
}

/**
 * Delete Chat History from LocalStorage.
 * @param {string} chat = Chat Name.
 */
export async function DeleteChatHistory(chat: string) {
  const json = await LocalStorage.getItem("chat_history");
  if (json) {
    const history: Map<string, RaycastChatMessage[]> = new Map(JSON.parse(json as string));
    chat !== "Current" ? history.delete(chat) : history.set("Current", []);
    await LocalStorage.setItem("chat_history", JSON.stringify([...history]));
  }
}

/**
 * Get Chat History Keys from LocalStorage.
 * @returns {Promise<string[]>}
 */
export async function GetChatHistoryKeys(): Promise<string[]> {
  const json = await LocalStorage.getItem("chat_history");
  if (json) {
    const history: Map<string, RaycastChatMessage[]> = new Map(JSON.parse(json as string));
    return [...history.keys()];
  }
  return ["Current"];
}
