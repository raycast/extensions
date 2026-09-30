import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { correspondentsResponse } from "../models/paperlessResponse.model";

const { paperlessURL }: Preferences = getPreferenceValues();
const { apiToken }: Preferences = getPreferenceValues();

export const fetchCorrespondents = async (): Promise<correspondentsResponse["results"]> => {
  try {
    const response = await fetch(`${paperlessURL}/api/correspondents/?page_size=10000`, {
      headers: { Authorization: `Token ${apiToken}` },
    });
    const json = await response.json();
    const correspondents = json as correspondentsResponse;
    return correspondents.results;
  } catch (error) {
    await showToast(Toast.Style.Failure, `Could not fetch correspondents ${error}`);
    return Promise.reject([]);
  }
};
