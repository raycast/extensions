import {
  environment,
  getPreferenceValues,
  getSelectedText,
  Clipboard,
  getSelectedFinderItems,
  BrowserExtension,
} from "@raycast/api";
import { RaycastImage } from "../types";
import {
  ErrorRaycastBrowserExtantion,
  ErrorRaycastClipboardTextEmpty,
  ErrorRaycastImageEmpty,
  ErrorRaycastPermissionAccessibility,
  ErrorRaycastSelectedTextEmpty,
} from "./error";
import fs from "fs";
import { fileTypeFromBuffer } from "file-type";
import { OllamaManager } from "../ollama/ollama";
import { ModelCapability } from "../enum";
import { UiModelDetails } from "./types";
import { getCustomProvider, getCustomModelsMap, loadCustomServerNames } from "../providers/unified-provider";
import { fetchProviderModels } from "../providers/model-sync";
import { loadCustomProviders } from "../providers/storage";

async function enrichOllamaCapabilities(provider: import("../providers/types").CustomProvider): Promise<void> {
  if (provider.lifecycle !== "ollama" || provider.models.length === 0) return;
  const baseUrl = provider.base_url.replace(/\/v1\/?$/, "");
  const ollama = new OllamaManager({ url: baseUrl });
  provider.models = await Promise.all(
    provider.models.map(async (model) => {
      try {
        const details = await ollama.show(model.id);
        const capabilities = details.capabilities || [];
        return {
          ...model,
          abilities: {
            ...model.abilities,
            vision: { supported: capabilities.includes(ModelCapability.Vision) },
            tools: { supported: capabilities.includes(ModelCapability.Tools) },
            reasoning_effort: { supported: capabilities.includes(ModelCapability.Thinking) },
          },
        };
      } catch {
        return model;
      }
    }),
  );
}

/**
 * Get Ollama and Custom Provider Server Array.
 * @returns Servers Names Array.
 */
export async function GetServerArray(): Promise<string[]> {
  const custom = (await loadCustomServerNames()).sort();
  return custom.length > 1 ? ["All", ...custom] : custom;
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
/**
 * Get available models from OpenAI-compatible providers. Model discovery is
 * best-effort so an offline provider does not hide manually configured models.
 * @returns Map with All Available Model.
 */
export async function GetModels(): Promise<Map<string, UiModelDetails[]>> {
  const providers = await loadCustomProviders();
  await Promise.all(
    providers.map(async (provider) => {
      try {
        provider.models = await fetchProviderModels(provider);
        await enrichOllamaCapabilities(provider);
      } catch {
        // Retain configured models when discovery is not supported or offline.
      }
    }),
  );
  return getCustomModelsMap(providers);
}

/**
 * Get Available Model for given Server.
 * @param server - Ollama Server Name or Custom Provider Name.
 * @param List of Available Models.
 */
export async function GetAvailableModel(server: string): Promise<Array<{ name: string; context?: number }>> {
  const provider = await getCustomProvider(server);
  if (!provider) throw new Error(`Provider '${server}' not found`);
  try {
    provider.models = await fetchProviderModels(provider);
    await enrichOllamaCapabilities(provider);
  } catch {
    // A manually added provider can be used without a discoverable /models endpoint.
  }
  return provider.models.map((model) => ({ name: model.id, context: model.context }));
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
  const fileType = await fileTypeFromBuffer(new Uint8Array(buffer));
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
export async function GetPromptTokenSelectionText(): Promise<string | undefined> {
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
 * Check if selected Model has thinking capabilities.
 *
 * @param models - Models from all Ollama Server.
 * @param server - Selected Ollama Server.
 * @param model - Selected Ollama Model name.
 * @returns true if model has thinking capabilities.
 */
export function isThinkingModel(models?: Map<string, UiModelDetails[]>, server?: string, model?: string): boolean {
  if (!models || !server || !model) return false;

  const serverModels = models.get(server);
  if (!serverModels) return false;

  const capabilities = serverModels.find((value) => value.name === model)?.capabilities;
  if (!capabilities || !capabilities.includes("thinking")) return false;

  return true;
}
