import got from "got";
import { API } from "./api";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<HideEmailCloudflare.Preferences>();

export async function listDestinationAddresses(): Promise<Array<string>> {
  const res: HideEmailCloudflare.ListDestinationAddressesRes = await got
    .get(API.listDestinationAddresses(), {
      headers: {
        "X-Auth-Email": preferences.email,
        "X-Auth-Key": preferences.token,
        "Content-Type": "application/json",
      },
    })
    .json();

  if (!res.success) throw new Error(res.errors.join(", "));

  return res.result.map((res) => res.email);
}
