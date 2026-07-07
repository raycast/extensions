import { RestClient } from "./rest-client";
import { LearningItemsClient } from "./learning-items-client";
import { GroupsClient } from "./groups-client";
import { BlueprintsClient } from "./blueprints-client";
import { SuggestionsClient } from "./suggestions-client";
import { TrainingsClient } from "./trainings-client";
import { LanguagesClient } from "./languages-client";
import { SettingsClient } from "./settings-client";
import { ImagesClient } from "./images-client";
import { UserClient } from "./user-client";
import { LookupClient } from "./lookup-client";
import { StatsClient } from "./stats-client";
import { getAccessToken } from "./auth";
import { getApiUrl } from "./config";

export * from "./rest-client";
export {
  authorize,
  signInWithGoogle,
  requestEmailMagicLink,
  verifyEmailMagicLink,
  getAccessToken,
  logout,
  getOAuthClient,
} from "./auth";
export * from "./learning-items-client";
export * from "./groups-client";
export * from "./blueprints-client";
export * from "./suggestions-client";
export * from "./trainings-client";
export * from "./languages-client";
export * from "./settings-client";
export * from "./images-client";
export * from "./user-client";
export * from "./lookup-client";
export * from "./stats-client";

export interface ApiClient {
  learningItems: LearningItemsClient;
  groups: GroupsClient;
  blueprints: BlueprintsClient;
  suggestions: SuggestionsClient;
  trainings: TrainingsClient;
  languages: LanguagesClient;
  settings: SettingsClient;
  images: ImagesClient;
  user: UserClient;
  lookup: LookupClient;
  stats: StatsClient;
}

export function createApiClient(): ApiClient {
  const restClient = new RestClient(getApiUrl(), getAccessToken);

  return {
    learningItems: new LearningItemsClient(restClient),
    groups: new GroupsClient(restClient),
    blueprints: new BlueprintsClient(restClient),
    suggestions: new SuggestionsClient(restClient),
    trainings: new TrainingsClient(restClient),
    languages: new LanguagesClient(restClient),
    settings: new SettingsClient(restClient),
    images: new ImagesClient(restClient),
    user: new UserClient(restClient),
    lookup: new LookupClient(restClient),
    stats: new StatsClient(restClient),
  };
}
