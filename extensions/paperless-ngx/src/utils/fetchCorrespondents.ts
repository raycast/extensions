import { getPreferenceValues, showToast, Toast, Cache } from "@raycast/api";
import fetch from "node-fetch";
import { Correspondent, correspondentsResponse } from "../models/paperlessResponse.model";
import { Preferences } from "../models/preferences.model";

const { paperlessURL }: Preferences = getPreferenceValues();
const { apiToken }: Preferences = getPreferenceValues();

const cache = new Cache();

export const fetchCorrespondents = async (): Promise<correspondentsResponse> => {
  try {
    const response = await fetch(`${paperlessURL}/api/correspondents/?page_size=10000`, {
      headers: { Authorization: `Token ${apiToken}` },
    });
    const json = await response.json();
    const correspondents = json as correspondentsResponse;
    await cacheCorrespondents(correspondents.results);
    return correspondents;
  } catch (error) {
    await showToast(Toast.Style.Failure, `Could not fetch correspondents ${error}`);
    return Promise.reject([]);
  }
};

export const cacheCorrespondents = async (value: Correspondent[]): Promise<Correspondent[]> => {
  cache.set("correspondents", JSON.stringify(value));
  return value;
};
