import { getPreferenceValues } from "@raycast/api";
import { WebClient } from "@slack/web-api";

const accessToken = getPreferenceValues<{ accessToken: string }>().accessToken;
export const slackWebClient: WebClient = new WebClient(accessToken);
