import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { RunsFetchResponse, Preferences } from "./types";

const preferences: Preferences = getPreferenceValues();
const token = preferences.dbtCloudAPIToken;
const account_id = preferences.dbtCloudAcountID;

export const returnRuns = async (): Promise<RunsFetchResponse> => {
  try {
    const response = await fetch(
      `https://cloud.getdbt.com/api/v2/accounts/${account_id}/runs?order_by=-finished_at&include_related=["job"]`,
      {
        method: "GET",
        headers: {
          Authorization: `Token ${token}`,
        },
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await response.json();
    return json["data"] as RunsFetchResponse;
  } catch (error) {
    showToast(Toast.Style.Failure, "An error occured", "Could not fetch API, check your credentials");
    return Promise.resolve([]);
  }
};
