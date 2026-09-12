import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<{
  datahubFrontendUrl: string;
  datahubGraphqlEndpoint: string;
}>();

export const DATAHUB_FRONTEND = preferences.datahubFrontendUrl;
export const DATAHUB_GMS_GRAPHQL_ENDPOINT = preferences.datahubGraphqlEndpoint;
