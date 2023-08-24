import { getPreferenceValues } from "@raycast/api";
import { Provider } from "./base";

//XXX raycast doesn't support dynamic import
import openai from "./openai";
import raycast from "./raycast";
import azure from "./azure";
import palm2 from "./palm2";
/* eslint-disable @typescript-eslint/no-explicit-any */

const PROVIDER_CLASSES: Record<string, new (...args: any[]) => Provider> = {
  openai: openai,
  raycast: raycast,
  azure: azure,
  palm2: palm2,
};

const record: Record<string, Provider> = {};
export function getProvider(provider: string): Provider {
  if (!(provider in record)) {
    const preferences = getPreferenceValues<{
      entrypoint: string;
      apikey: string;
      apiModel: string;
    }>();
    const providerClass = PROVIDER_CLASSES[provider];
    record[provider] = new providerClass(preferences);
  }
  return record[provider];
}
