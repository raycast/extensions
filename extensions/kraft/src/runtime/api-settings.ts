import { ApiCompatible, normalizeApiBase } from "./api-compatibility";

export interface ApiSettings {
  apiBase: string;
  apiKey: string;
  apiCompatible: ApiCompatible;
  validatedAt?: string;
  validatedModel?: string;
}

export const defaultApiSettings: ApiSettings = {
  apiBase: "",
  apiKey: "",
  apiCompatible: "openai",
};

export function sanitizeApiSettings(settings: Partial<ApiSettings>): ApiSettings {
  return {
    apiBase: settings.apiBase ? normalizeApiBase(settings.apiBase) : "",
    apiKey: settings.apiKey?.trim() ?? "",
    apiCompatible: settings.apiCompatible ?? defaultApiSettings.apiCompatible,
    validatedAt: settings.validatedAt,
    validatedModel: settings.validatedModel,
  };
}
