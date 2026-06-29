import { getPreferenceValues } from "@raycast/api";
import { dbtV2Response, RunsFetchResponse } from "./types";

const preferences = getPreferenceValues<Preferences>();
const token = preferences.dbtCloudAPIToken;
const account_id = preferences.dbtCloudAcountID;
const account_prefix = preferences.dbtCloudAcountPrefix;
const endpoint = preferences.dbtCloudEndpoint.replace("{account_prefix}", account_prefix ?? "");

export const returnRuns = async (): Promise<RunsFetchResponse> => {
  const response = await fetch(
    `${endpoint}/api/v2/accounts/${account_id}/runs?order_by=-finished_at&include_related=["job"]`,
    {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
      },
    },
  );
  const json = (await response.json()) as dbtV2Response<RunsFetchResponse>;
  if (!json.status.is_success) throw new Error(json.status.user_message || response.statusText);
  return json.data;
};
