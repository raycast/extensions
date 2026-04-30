import type { SuggestionRequest, SuggestionResponse, SupportedLanguage } from "../types";
import { RestClient } from "./rest-client";

export class SuggestionsClient {
  constructor(private readonly restClient: RestClient) {}

  async getSuggestion(
    userLanguage: SupportedLanguage,
    suggestionRequest: SuggestionRequest,
  ): Promise<SuggestionResponse> {
    return this.restClient.post<SuggestionResponse>(
      `/api/languages/${userLanguage.languageCode}/suggestions`,
      suggestionRequest,
    );
  }
}
