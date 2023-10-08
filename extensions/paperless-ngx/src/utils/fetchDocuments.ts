import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { documentsResponse } from "../models/paperlessResponse.model";
import { Preferences } from "../models/preferences.model";

const { paperlessURL }: Preferences = getPreferenceValues();
const { apiToken }: Preferences = getPreferenceValues();

export const fetchDocuments = async (searchTerm = ""): Promise<documentsResponse> => {
  try {
    const response = await fetch(`${paperlessURL}/api/documents/?query=${searchTerm}`, {
      headers: { Authorization: `Token ${apiToken}` },
    });
    const json = await response.json();
    return json as documentsResponse;
  } catch (error) {
    await showToast(Toast.Style.Failure, `Could not fetch documents ${error}`);
    return Promise.reject([]);
  }
};
