import { getPreferenceValues } from "@raycast/api";
import axios from "axios";

export const TANA_URL = "https://europe-west1-tagr-prod.cloudfunctions.net";

type Preferences = {
  nodeApiToken: string;
};
export const prefs = getPreferenceValues<Preferences>();

export type TanaResponse = string | { err: string };

export const nodeApi = axios.create({
  baseURL: TANA_URL,
  headers: {
    authorization: `Bearer ${prefs.nodeApiToken}`,
  },
});
