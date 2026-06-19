import type { SupportedLanguage } from "../types";
import { RestClient } from "./rest-client";

interface SupportedLanguagesResponse {
  supportedLanguages: SupportedLanguage[];
}

export class SettingsClient {
  constructor(private readonly restClient: RestClient) {}

  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    const response = await this.restClient.get<SupportedLanguagesResponse>("/api/settings/languages");
    return response.supportedLanguages;
  }
}
