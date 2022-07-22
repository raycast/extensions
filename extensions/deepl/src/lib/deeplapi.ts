import { useCallback, useEffect, useRef, useState } from "react";
import fetch, { AbortError, FormData } from "node-fetch";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";

export function setUpTranslation(targetLanguage: Language): {
  setText: (text: string) => Promise<void>;
  state: TranslationState;
  setSourceLanguage: (sourceLanguage: Language | null) => void;
} {
  const [state, setState] = useState<TranslationState>({
    text: "",
    translation: null,
    sourceLanguage: null,
    usage: null,
    isLoading: true,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const setSourceLanguage = useCallback(
    (sourceLanguage: Language | null): void => {
      setState((oldState: TranslationState) => ({ ...oldState, sourceLanguage }));
    },
    [setState]
  );

  const setText = useCallback(
    async function translate(text: string): Promise<void> {
      setState((oldState: TranslationState) => ({ ...oldState, text: text }));
    },
    [abortControllerRef, setState]
  );

  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setState((oldState: TranslationState) => ({ ...oldState, isLoading: true }));

    async function performTranslation(): Promise<void> {
      try {
        const translation =
          state.text.length > 0
            ? await getTranslation(
                state.text,
                state.sourceLanguage,
                targetLanguage,
                abortControllerRef.current?.signal ?? null
              )
            : null;

        const usage = translation != null ? await getUsage(abortControllerRef.current?.signal ?? null) : null;

        setState((oldState: TranslationState) => ({ ...oldState, translation, usage, isLoading: false }));
      } catch (error) {
        setState((oldState: TranslationState) => ({ ...oldState, isLoading: false }));

        if (error instanceof AbortError) return;

        console.error("Translation error", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Could not perform translation",
          message: String(error),
        }).then();
      }
    }

    performTranslation().then();
  }, [state.text, state.sourceLanguage]);

  return { state, setSourceLanguage, setText };
}

async function getTranslation(
  text: string,
  sourceLanguage: Language | null,
  targetLanguage: Language,
  signal: AbortSignal | null
): Promise<Translation> {
  const preferences = getPreferenceValues();

  const formData = new FormData();
  formData.append("auth_key", preferences.apikey);
  formData.append("text", text);
  if (sourceLanguage != null) {
    formData.append("source_lang", sourceLanguage.code);
  }
  formData.append("target_lang", targetLanguage.code);

  const response = await fetch(apiUrlFor("translate"), {
    method: "post",
    signal: signal,
    body: formData,
  });

  const json = (await response.json()) as TranslationResponse | ErrorResponse;

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  // We only ever send one query to the API, so only one result is ever returned.
  return json.translations[0];
}

export async function getUsage(signal: AbortSignal | null): Promise<Usage | null> {
  const preferences = getPreferenceValues();

  const formData = new FormData();
  formData.append("auth_key", preferences.apikey);

  // Fetch after getting translation result to get up-to-date usage info
  const response = await fetch(apiUrlFor("usage"), {
    method: "post",
    signal: signal,
    body: formData,
  });

  const json = (await response.json()) as Usage | ErrorResponse;

  return !response.ok || "message" in json ? null : json;
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

function apiUrlFor(endpoint: Endpoint): string {
  const baseUrl = getPreferenceValues().plan == "free" ? "https://api-free.deepl.com/v2/" : "https://api.deepl.com/v2/";

  return baseUrl + endpoint;
}

type Endpoint = "translate" | "usage" | "languages";

export type Language = {
  name: string;
  code: string;
};

export type TranslationResponse = {
  translations: Translation[];
};

export type ErrorResponse = {
  message: string;
};

export type TranslationState = {
  text: string;
  translation: Translation | null;
  sourceLanguage: Language | null;
  usage: Usage | null;
  isLoading: boolean;
};

export type Translation = {
  text: string;
  detected_source_language: string;
};

export type Usage = {
  character_count: number;
  character_limit: number;
};
