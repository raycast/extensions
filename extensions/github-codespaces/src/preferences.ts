import { getPreferenceValues } from "@raycast/api";
import { Client } from "./types";

const p = getPreferenceValues();

export const personalAccessToken = p.personalAccessToken as string;
export const preferredEditor = p.preferredEditor as Client;
export const useInsiders = (p.useInsiders || false) as boolean;
