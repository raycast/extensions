import got from "got";
import { API } from "./api";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<HideEmailCloudflare.Preferences>();

export async function createRoutingRule(
  createdEmail: string,
  destinationEmail: string,
  name: string
): Promise<boolean> {
  const res: HideEmailCloudflare.RuleRes = await got
    .post(API.createRoutingRule(), {
      headers: {
        "X-Auth-Email": preferences.email,
        "X-Auth-Key": preferences.token,
        "Content-Type": "application/json",
      },
      json: {
        name,
        enabled: true,
        matchers: [{ type: "literal", field: "to", value: createdEmail }],
        actions: [{ type: "forward", value: [destinationEmail] }],
      },
    })
    .json();

  if (!res.success) throw new Error(res.errors.join(", "));

  return res.success;
}
