import {
  environment,
  getPreferenceValues,
  getSelectedText,
  Clipboard,
  showToast,
  Toast,
  getSelectedFinderItems,
  BrowserExtension,
} from "@raycast/api";
import { Ollama } from "../ollama/ollama";
import { GetOllamaServerByName, GetOllamaServers } from "../settings/settings";
import { Preferences, RaycastImage } from "../types";
import {
  ErrorRaycastBrowserExtantion,
  ErrorRaycastClipboardTextEmpty,
  ErrorRaycastImageEmpty,
  ErrorRaycastPermissionAccessibility,
  ErrorRaycastSelectedTextEmpty,
} from "./error";
import fs from "fs";
import fetch from "node-fetch";
import { fileTypeFromBuffer } from "file-type";
import { OllamaApiTagsResponseModel } from "../ollama/types";
import { UiModelDetails } from "./types";

/**
 * Get Ollama Server Array.
 * @returns Servers Names Array.
 */
export async function GetServerArray(): Promise<string[]> {
  const s = await GetOllamaServers();
  const a = [...s.keys()].sort();
  const al = a.filter((v) => v === "Local");
  const ao = a.filter((v) => v !== "Local");
  if (a.length > 1) return ["All", ...al, ...ao];
  return [...al, ...ao];
}

/**
 * Format "expires_at" value returnet by Ollama PS.
 * @param expires_at
 * @returns "expires_at" formatted as "0h0m0s".
 */
export function FormatOllamaPsModelExpireAtFormat(expires_at: string): string {
  const now = new Date();
  const expire = new Date(expires_at);

  let timeoutS = "";
  let timeout = Math.floor((expire.getTime() - now.getTime()) * 0.001);
  ["s", "m", "h"].every((v) => {
    const timeoutT = timeout / 60;
    if (v === "h") {
      if (timeout > 1000) {
        timeoutS = "♾️";
      } else {
        timeoutS = `${Math.floor(timeout)}${v}` + timeoutS;
      }
      return false;
    }
    if (timeoutT < 1) {
      timeoutS = `${Math.floor(timeout)}${v}` + timeoutS;
      return false;
    }
    timeoutS = `${Math.round((timeoutT % 1) * 60)}${v}` + timeoutS;
    timeout = Math.floor(timeoutT);
    return true;
  });

  return timeoutS;
}

/**
 * Get Ollama Server Class.
 * @returns Server Map.
 */
export async function GetServerClass(): Promise<Map<string, Ollama>> {
  const o: Map<string, Ollama> = new Map();
  const s = await GetOllamaServers();
  s.forEach((s, k) => o.set(k, new Ollama(s)));
  return o;
}

/**
 * Get Ollama Available Models.
 * @returns Map with All Available Model.
 */
export async function GetModels(): Promise<Map<string, UiModelDetails[]>> {
  const o = new Map<string, UiModelDetails[]>();
  const s = await GetServerClass();
  await Promise.all(
    [...s.entries()].map(async (s): Promise<void> => {
      const tags = await s[1].OllamaApiTags().catch(async (e: Error) => {
        await showToast({ style: Toast.Style.Failure, title: `'${s[0]}' Server`, message: e.message });
        return undefined;
      });
      if (tags)
        o.set(
          s[0],
          await Promise.all(
            tags.models.map(async (tag): Promise<UiModelDetails> => {
              const show = await s[1].OllamaApiShow(tag.name).catch(async (e: Error) => {
                await showToast({ style: Toast.Style.Failure, title: `'${s[0]}' Server`, message: e.message });
                return undefined;
              });
              return {
                name: tag.name,
                capabilities: show && show.capabilities,
              };
            })
          )
        );
    })
  );
  return o;
}

/**
 * Get Available Model for given Server.
 * @param server - Ollama Server Name.
 * @param List of Avalibale Models.
 */
export async function GetAvailableModel(server: string): Promise<OllamaApiTagsResponseModel[]> {
  const s = await GetOllamaServerByName(server);
  const o = new Ollama(s);
  const m = await o.OllamaApiTags();
  return m.models;
}

/**
 * Return prompt with all token replaced with text.
 * @param prompt.
 */
export async function PromptTokenParser(prompt: string): Promise<string> {
  const pts = await PromptTokenSelectionParser(prompt);
  if (pts) prompt = pts;
  const pbt = await PromptTokenBrowserTabParser(prompt);
  if (pbt) prompt = pbt;
  return prompt;
}

/**
 * Return prompt without {image} token with images.
 * @param prompt.
 */
export async function PromptTokenImageParser(prompt: string): Promise<[string, RaycastImage[]] | undefined> {
  const r = /{[ ]*image[ ]*}/i;
  if (prompt.match(r)) {
    const images = await GetImage();
    if (!images || images.length === 0) throw ErrorRaycastImageEmpty;
    return [prompt.replace(r, ""), images];
  }
  return undefined;
}

/**
 * Return prompt with {selection} token replaced with selected text or clipboard text.
 * @param prompt.
 */
async function PromptTokenSelectionParser(prompt: string): Promise<string | undefined> {
  const r = /{[ ]*selection[ ]*}/i;
  if (prompt.match(r)) {
    const t = await GetPromptTokenSelectionText();
    if (t) prompt = prompt.replace(r, t);
  }
  return prompt;
}

/**
 * Return prompt with {browser-tab} token replaced with browser tab page text.
 */
async function PromptTokenBrowserTabParser(prompt: string): Promise<string | undefined> {
  const r = /{[ ]*browser-tab[ ]*(?:[ ]+format="(html|markdown|text)"[ ]*)?}/i;
  if (prompt.match(r)) {
    if (!environment.canAccess(BrowserExtension)) throw ErrorRaycastBrowserExtantion;
    const t = prompt.match(r);
    const o = await BrowserExtension.getContent({
      format: `${t?.groups && t.groups[1] ? (t.groups[1] as "html" | "markdown" | "text") : "markdown"}`,
    });
    prompt = prompt.replace(r, o);
  }
  return prompt;
}

/**
 * Get images from Finder if no file is selected fallback to Clipboard.
 * @returns {RaycastImage[]}
 */
export async function GetImage(): Promise<RaycastImage[]> {
  const image: RaycastImage[] = [];
  if (!environment.canAccess(getSelectedFinderItems)) throw ErrorRaycastPermissionAccessibility;
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
    if (!environment.canAccess(Clipboard)) throw ErrorRaycastPermissionAccessibility;
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
 * Get Image from disk.
 * @param {string} file
 */
async function GetImageFromFile(file: string): Promise<RaycastImage> {
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
 * Get Image from web.
 * @param {string} url
 * @returns {RaycastImage}
 */
async function GetImageFromUrl(url: string): Promise<RaycastImage | undefined> {
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
 * Get Selected Text.
 * @param fallback - set to `true` for enable fallback to clipboard.
 */
async function GetSelectedText(fallback = false): Promise<string | undefined> {
  if (!environment.canAccess(getSelectedText)) throw ErrorRaycastPermissionAccessibility;
  return await getSelectedText().catch(async () => {
    if (!fallback) throw ErrorRaycastSelectedTextEmpty;
    return await GetClipboardText();
  });
}

/**
 * Get Clipboard Text.
 * @param fallback - set to `true` for enable fallback to selected text.
 */
async function GetClipboardText(fallback = false): Promise<string | undefined> {
  if (!environment.canAccess(Clipboard)) throw ErrorRaycastPermissionAccessibility;
  return await Clipboard.readText().catch(async () => {
    if (!fallback) throw ErrorRaycastClipboardTextEmpty;
    return await GetSelectedText();
  });
}

/**
 * Get Text for {selection} token.
 */
async function GetPromptTokenSelectionText(): Promise<string | undefined> {
  let query: string | undefined;
  const p = getPreferenceValues<Preferences>();
  switch (p.ollamaResultViewInput) {
    case "SelectedText":
      query = await GetSelectedText(p.ollamaResultViewInputFallback);
      break;
    case "Clipboard":
      query = await GetClipboardText(p.ollamaResultViewInputFallback);
      break;
  }
  return query;
}
