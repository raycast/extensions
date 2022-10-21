import got from "got";
import { API } from "./api";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<HideEmailCloudflare.Preferences>();

export async function deleteRoutingRule(ruleID: string): Promise<boolean> {
  const res: HideEmailCloudflare.RuleRes = await got
    .delete(API.deleteRoutingRule(ruleID), {
      headers: {
        "X-Auth-Email": preferences.email,
        "X-Auth-Key": preferences.token,
        "Content-Type": "application/json",
      },
    })
    .json();

  if (!res.success) throw new Error(res.errors.join(", "));

  return res.success;
}
