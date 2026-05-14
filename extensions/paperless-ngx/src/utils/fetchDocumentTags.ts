import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { tagsResponse } from "../models/paperlessResponse.model";

const { paperlessURL }: Preferences = getPreferenceValues();
const { apiToken }: Preferences = getPreferenceValues();

export const fetchDocumentTags = async (): Promise<tagsResponse["results"]> => {
  try {
    const response = await fetch(`${paperlessURL}/api/tags/?page_size=10000`, {
      headers: { Authorization: `Token ${apiToken}` },
    });
    const json = await response.json();
    const tags = json as tagsResponse;
    return tags.results;
  } catch (error) {
    await showToast(Toast.Style.Failure, `Could not fetch documents tags ${error}`);
    return Promise.reject([]);
  }
};
