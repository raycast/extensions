//@ts-expect-error - I don't really care about the typings, they are used internally
import { NodeHttpClient } from "@shlinkio/shlink-js-sdk/node";
import { Preferences } from "../types/preferences";
import { ShlinkApiClient } from "@shlinkio/shlink-js-sdk";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

const serverInfo = { baseUrl: preferences.hostUrl, apiKey: preferences.apiKey };
export const apiClient = new ShlinkApiClient(new NodeHttpClient(), serverInfo);
