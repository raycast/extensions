import type { SingleLanguageBlueprintLearningItem } from "../types";
import { RestClient } from "./rest-client";

export class BlueprintsClient {
  constructor(private readonly restClient: RestClient) {}

  async getSingleLanguageBlueprintLearningItem(
    languageCode: string,
    translationLanguageCode: string,
    learningItemId: string,
  ): Promise<SingleLanguageBlueprintLearningItem> {
    return this.restClient.get<SingleLanguageBlueprintLearningItem>(
      `/api/languages/${languageCode}/blueprints/learning-items/${learningItemId}/translations/${translationLanguageCode}`,
    );
  }
}
