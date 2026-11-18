import type {
  GenerateTrainingRequest,
  GenericTrainingResult,
  MixedTraining,
  SupportedLanguage,
  TrainingType,
} from "../types";
import { RestClient } from "./rest-client";

export class TrainingsClient {
  constructor(private readonly restClient: RestClient) {}

  async generateMixedTraining({
    userLanguage,
    groupIds,
    trainingTypes,
    excludedTrainingTypes,
  }: {
    userLanguage: SupportedLanguage;
    groupIds?: string[];
    trainingTypes?: TrainingType[];
    excludedTrainingTypes?: TrainingType[];
  }): Promise<MixedTraining> {
    const request: GenerateTrainingRequest = {
      groupIds,
      trainingTypes,
      excludedTrainingTypes,
    };

    return this.restClient.post<MixedTraining>(`/api/languages/${userLanguage.languageCode}/trainings`, request);
  }

  async submitTrainingResult(userLanguage: SupportedLanguage, result: GenericTrainingResult): Promise<void> {
    return this.restClient.post<void>(`/api/languages/${userLanguage.languageCode}/trainings/results`, result);
  }
}
