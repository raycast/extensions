import { DefsBody, LanguageCode } from "../types";
import { EngineHookProps } from "./types";

const baseUrl = "https://translate.google.com";
interface GooglApiResult {
  data: {
    translations: GooglApiDefinitionItem[];
  };
}
interface GooglApiDefinitionItem {
  translatedText: string;
  detectedSourceLanguage: LanguageCode;
}
const prepareRequestUrl = (versioning: "v2" | "v3" = "v2") => {
  return (_query: string): RequestInfo => `https://translation.googleapis.com/language/translate/${versioning}`;
};

const getOpts = (query: string, to: LanguageCode, apiKey?: string, _from?: string): RequestInit => {
  const data = {
    target: to,
    q: query,
  };
  return {
    headers: {
      "X-goog-api-key": apiKey || "",
    },
    method: "POST",
    body: JSON.stringify(data),
  };
};
const parseData = (data: GooglApiResult): DefsBody<GooglApiDefinitionItem> => {
  const {
    data: { translations: definitions },
  } = data;
  const src = definitions[0] ? definitions[0].detectedSourceLanguage : undefined;
  return { definitions, src };
};
const parseDef = (def: GooglApiDefinitionItem) => {
  const { translatedText, detectedSourceLanguage } = def;
  return {
    key: detectedSourceLanguage,
    id: detectedSourceLanguage,
    title: translatedText,
    metaData: {
      toClipboard: [translatedText] as [string],
    },
  };
};
const GoogleApiEngine: EngineHookProps<GooglApiResult, GooglApiDefinitionItem> = {
  key: "googlapi",
  baseUrl: baseUrl,
  title: "Google Cloud Translation API",
  fallbackSearch: true,
  getUrl: prepareRequestUrl(),
  getOpts,
  parseData,
  parseDef,
};
export default GoogleApiEngine;
