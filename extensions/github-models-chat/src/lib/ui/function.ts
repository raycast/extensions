import {
  environment,
  getPreferenceValues,
  getSelectedText,
  Clipboard,
  showToast,
  Toast,
  getSelectedFinderItems,
  BrowserExtension,
  LocalStorage,
} from "@raycast/api";
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
import { UiModelDetails } from "./types";
import { listCatalog } from "../github/api";
import { OllamaApiTagsResponseModel } from "../ollama/types";
import type { Ollama } from "../ollama/ollama";

/**
 * Servers list (GitHub only).
 */
export async function GetServerArray(): Promise<string[]> {
  return ["GitHub"];
}

/**
 * Get GitHub Models catalog and map to UiModelDetails.
 */
export async function GetModels(): Promise<Map<string, UiModelDetails[]>> {
  const prefs = getPreferenceValues<Preferences>();
  const token = prefs.githubToken || "";
  const map = new Map<string, UiModelDetails[]>();
  try {
    const catalog = await listCatalog(token);
    const items: UiModelDetails[] = catalog.map((m) => {
      const caps: string[] = [];
      if (m.supported_output_modalities?.includes("text")) caps.push("completion");
      if (m.supported_input_modalities?.includes("image")) caps.push("vision");
      if (m.capabilities?.includes("tool-calling")) caps.push("tools");
      if (m.tags?.some((t) => /embed/i.test(t) || /embedding/i.test(t))) caps.push("embedding");
      const meta: Record<string, string | number | string[]> = {
        Publisher: m.publisher,
        Registry: m.registry,
        Version: m.version || "-",
        "Rate limit tier": m.rate_limit_tier || "-",
        "Input modalities": m.supported_input_modalities?.length ? m.supported_input_modalities : ["-"],
        "Output modalities": m.supported_output_modalities?.length ? m.supported_output_modalities : ["-"],
        Tags: m.tags?.length ? m.tags : ["-"],
        Capabilities: m.capabilities?.length ? m.capabilities : ["-"],
        "Max input tokens": m.limits?.max_input_tokens ?? "-",
        "Max output tokens": m.limits?.max_output_tokens ?? "-",
      };
      return { name: m.id, capabilities: caps, meta, summary: m.summary, url: m.html_url };
    });
    map.set("GitHub", items);
  } catch (e: any) {
    await showToast({ style: Toast.Style.Failure, title: "GitHub Models", message: String(e?.message || e) });
    map.set("GitHub", []);
  }
  return map;
}

/**
 * Return prompt with all token replaced with text.
 * @param prompt.
 */
export async function PromptTokenParser(prompt: string): Promise<string> {
  // Coerce to string to avoid runtime errors
  prompt = String(prompt ?? "");
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
  if (!prompt) return undefined;
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
  if (!prompt) return undefined;
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
  if (!prompt) return undefined;
  const r = /{[ ]*browser-tab[ ]*(?:[ ]+format="(html|markdown|text)"[ ]*)?}/i;
  if (prompt.match(r)) {
    if (!environment.canAccess(BrowserExtension)) throw ErrorRaycastBrowserExtantion;
    const t = prompt.match(r);
    const format = t && t[1] ? (t[1] as "html" | "markdown" | "text") : "markdown";
    const o = await BrowserExtension.getContent({ format });
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
  const fileType = await fileTypeFromBuffer(new Uint8Array(buffer));
  if (fileType && (fileType.mime === "image/jpeg" || fileType.mime === "image/png")) {
    const base64 = buffer.toString("base64");
    return {
      path: file,
      html: `<img src="data:${fileType.mime};base64,${base64}" alt="image" width="300" style="max-width:100%;height:auto;" />\n\n`,
      base64,
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
  const mimeFromUrl = url.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
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
      const base64 = Buffer.from(buffer).toString("base64");
      return {
        path: url,
        html: `<img src="data:${mimeFromUrl};base64,${base64}" alt="image" width="300" style="max-width:100%;height:auto;" />\n\n`,
        base64,
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

/**
 * Get Available Model for server (GitHub only).
 */
export async function GetAvailableModel(server: string): Promise<OllamaApiTagsResponseModel[]> {
  const prefs = getPreferenceValues<Preferences>();
  const token = prefs.githubToken || "";
  if (server !== "GitHub") return [];
  const catalog = await listCatalog(token);
  // Map to minimal shape compatible with existing usages
  return catalog.map((m) => ({
    name: m.id,
    modified_at: m.version || "",
    size: 0,
    digest: "",
    details: { format: "", family: "", families: [], parameter_size: "", quantization_level: "" },
  }));
}

/**
 * Get Server Class (GitHub only).
 */
export async function GetServerClass(): Promise<Map<string, Ollama>> {
  // GitHub-only mode: no local Ollama servers; return empty map
  return new Map();
}

/**
 * Format Ollama Ps Model Expire At (GitHub only).
 */
export function FormatOllamaPsModelExpireAtFormat(expires_at: string): string {
  // No-op formatter for GitHub-only mode
  return expires_at;
}
