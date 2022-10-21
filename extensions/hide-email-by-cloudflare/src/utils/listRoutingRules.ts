import got from "got";
import { API } from "./api";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<HideEmailCloudflare.Preferences>();

export async function listRoutingRules(idx: number): Promise<HideEmailCloudflare.RuleRes> {
  const res: HideEmailCloudflare.RuleRes = await got
    .get(API.listRoutingRules(idx), {
      headers: {
        "X-Auth-Email": preferences.email,
        "X-Auth-Key": preferences.token,
        "Content-Type": "application/json",
      },
    })
    .json();

  if (!res.success) throw new Error(res.errors.join(", "));

  return res;
}
