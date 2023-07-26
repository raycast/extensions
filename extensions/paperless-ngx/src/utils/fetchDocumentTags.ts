import { getPreferenceValues, showToast, Toast, Cache } from "@raycast/api";
import fetch from "node-fetch";
import { tagsResponse, Tag } from "../models/paperlessResponse.model";
import { Preferences } from "../models/preferences.model";

const { paperlessURL }: Preferences = getPreferenceValues();
const { apiToken }: Preferences = getPreferenceValues();

const cache = new Cache();

export const fetchDocumentTags = async (): Promise<tagsResponse> => {
  try {
    const response = await fetch(`${paperlessURL}/api/tags/?page_size=10000`, {
      headers: { Authorization: `Token ${apiToken}` },
    });
    const json = await response.json();
    const tags = json as tagsResponse;
    await cacheDocumentTags(tags.results);
    return tags;
  } catch (error) {
    await showToast(Toast.Style.Failure, `Could not fetch documents tags ${error}`);
    return Promise.reject([]);
  }
};

export const cacheDocumentTags = async (value: Tag[]): Promise<Tag[]> => {
  cache.set("tags", JSON.stringify(value));
  return value;
};
