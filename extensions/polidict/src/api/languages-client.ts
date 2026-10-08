import type { SupportedLanguage } from "../types";
import { RestClient } from "./rest-client";

export interface UserLanguages {
  languages: SupportedLanguage[];
  nativeLanguage?: SupportedLanguage;
}

export class LanguagesClient {
  constructor(private readonly restClient: RestClient) {}

  async getUserLanguages(): Promise<SupportedLanguage[]> {
    const response = await this.restClient.get<{
      languages: SupportedLanguage[];
    }>("/api/languages");
    return response.languages;
  }

  async getNativeLanguage(): Promise<SupportedLanguage | null> {
    try {
      return await this.restClient.get<SupportedLanguage>("/api/languages/native");
    } catch {
      return null;
    }
  }

  async addLanguage(languageCode: string): Promise<SupportedLanguage[]> {
    const response = await this.restClient.put<{
      languages: SupportedLanguage[];
    }>(`/api/languages/${languageCode}`);
    return response.languages;
  }

  async removeLanguage(languageCode: string): Promise<SupportedLanguage[]> {
    const response = await this.restClient.delete<{
      languages: SupportedLanguage[];
    }>(`/api/languages/${languageCode}`);
    return response.languages;
  }

  async setNativeLanguage(languageCode: string): Promise<SupportedLanguage> {
    return this.restClient.put<SupportedLanguage>(`/api/languages/native/${languageCode}`);
  }

  async removeNativeLanguage(): Promise<void> {
    await this.restClient.delete<void>("/api/languages/native");
  }
}
