import type { LookupResponse } from "../types";
import { RestClient } from "./rest-client";

export class LookupClient {
  constructor(private readonly restClient: RestClient) {}

  async lookup(languageCode: string, text: string, options?: { localAi?: boolean }): Promise<LookupResponse> {
    const params: Record<string, string> = { text };
    if (options?.localAi) {
      params["localAi"] = "true";
    }
    return this.restClient.get<LookupResponse>(`/api/languages/${languageCode}/lookup`, params);
  }
}
