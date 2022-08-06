import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Response, useFetch } from "@raycast/utils";
import { URL, URLSearchParams } from "url";

export type Language = {
  name: string;
  code: string;
};

export type Translation = {
  text: string;
  detectedSourceLanguage: Language;
};

export type Usage = {
  characterCount: number;
  characterLimit: number;
};

export function useTranslation(text: string, sourceLanguage: Language | undefined, targetLanguage: Language) {
  const preferences = getPreferenceValues();

  const body = new URLSearchParams({
    auth_key: preferences.api_key,
    text: text,
    target_lang: targetLanguage.code,
  });
  if (sourceLanguage != undefined) {
    body.append("source_lang", sourceLanguage.code);
  }

  return useFetch<Translation>(apiURL("translate"), {
    keepPreviousData: true,
    method: "POST",
    headers: {
      "User-Agent": "Raycast DeepL Extension",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    execute: text.length > 0,
    parseResponse: parseTranslationResponse,
    onError: handleError,
  });
}

async function parseTranslationResponse(response: Response): Promise<Translation> {
  let json;

  try {
    json = (await response.json()) as
      | {
          translations: {
            text: string;
            detected_source_language: string;
          }[];
        }
      | { message: string };
  } catch (error) {
    throw new Error("Invalid API Key");
  }

  if ("message" in json) {
    if (json.message.match(/^Wrong endpoint/i)) {
      const planName = getPreferenceValues().plan != "free" ? "Free" : "Pro";
      throw new Error(`Please select the ${planName} plan in the preferences`);
    } else {
      throw new Error(json.message);
    }
  } else if (!response.ok) {
    throw new Error(response.statusText);
  }

  const result = json.translations[0];
  const detectedSourceLanguage = sourceLanguages.find((language) => language.code === result.detected_source_language);
  if (!detectedSourceLanguage) throw Error("Could not determine source language");

  return {
    text: result.text,
    detectedSourceLanguage: detectedSourceLanguage,
  };
}

export function useUsage() {
  const preferences = getPreferenceValues();

  return useFetch<Usage>(apiURL("usage"), {
    keepPreviousData: true,
    method: "POST",
    headers: {
      "User-Agent": "Raycast DeepL Extension",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `auth_key=${preferences.api_key}`,
    parseResponse: parseUsageResponse,
    onError: handleError,
  });
}

async function parseUsageResponse(response: Response): Promise<Usage> {
  const json = (await response.json()) as { character_count: number; character_limit: number } | { message: string };

  if ("message" in json) {
    if (json.message.match(/^Wrong endpoint/i)) {
      const planName = getPreferenceValues().plan != "free" ? "Free" : "Pro";
      throw new Error(`Please select the ${planName} plan in the preferences`);
    } else {
      throw new Error(json.message);
    }
  } else if (!response.ok) {
    throw new Error(response.statusText);
  }

  return {
    characterCount: json.character_count,
    characterLimit: json.character_limit,
  };
}

function handleError(error: Error) {
  console.error("useTranslation", error);
  showToast({
    style: Toast.Style.Failure,
    title: error.message,
  }).then();
}

function apiURL(endpoint: string): URL {
  const freePlan = getPreferenceValues().plan === "free";
  const url = new URL(`https://api${freePlan ? "-free" : ""}.deepl.com/v2/`);
  url.pathname += endpoint;
  return url;
}

export const sourceLanguages: Language[] = [
  { name: "🇧🇬 Bulgarian", code: "BG" },
  { name: "🇨🇳 Chinese (simplified)", code: "ZH" },
  { name: "🇨🇿 Czech", code: "CS" },
  { name: "🇩🇰 Danish", code: "DA" },
  { name: "🇳🇱 Dutch", code: "NL" },
  { name: "🇬🇧 English", code: "EN" },
  { name: "🇪🇪 Estonian", code: "ET" },
  { name: "🇫🇮 Finnish", code: "FI" },
  { name: "🇫🇷 French", code: "FR" },
  { name: "🇩🇪 German", code: "DE" },
  { name: "🇬🇷 Greek", code: "EL" },
  { name: "🇭🇺 Hungarian", code: "HU" },
  { name: "🇮🇩 Indonesian", code: "ID" },
  { name: "🇮🇹 Italian", code: "IT" },
  { name: "🇯🇵 Japanese", code: "JA" },
  { name: "🇱🇻 Latvian", code: "LV" },
  { name: "🇱🇹 Lithuanian", code: "LT" },
  { name: "🇵🇱 Polish", code: "PL" },
  { name: "🇵🇹 Portuguese", code: "PT" },
  { name: "🇷🇴 Romanian", code: "RO" },
  { name: "🇷🇺 Russian", code: "RU" },
  { name: "🇸🇰 Slovak", code: "SK" },
  { name: "🇸🇮 Slovenian", code: "SL" },
  { name: "🇪🇸 Spanish", code: "ES" },
  { name: "🇸🇪 Swedish", code: "SV" },
  { name: "🇹🇷 Turkish", code: "TR" },
];
