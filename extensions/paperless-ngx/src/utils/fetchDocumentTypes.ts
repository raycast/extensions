import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { typesResponse } from "../models/paperlessResponse.model";

const { paperlessURL }: Preferences = getPreferenceValues();
const { apiToken }: Preferences = getPreferenceValues();

export const fetchDocumentTypes = async (): Promise<typesResponse["results"]> => {
  try {
    const response = await fetch(`${paperlessURL}/api/document_types/?page_size=10000`, {
      headers: { Authorization: `Token ${apiToken}` },
    });
    const json = await response.json();
    const types = json as typesResponse;
    return types.results;
  } catch (error) {
    await showToast(Toast.Style.Failure, `Could not fetch documents types ${error}`);
    return Promise.reject([]);
  }
};
