import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import Preferences from "../model/preferences";
import MixpanelUser, { parseUser } from "../model/user";

export default async function findUsers(data: string): Promise<MixpanelUser[]> {
  const prefs = getPreferenceValues<Preferences>();
  const token = Buffer.from(`${prefs.service_account}:${prefs.service_account_secret}`).toString("base64");
  const options = {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${token}`,
    },
    body: new URLSearchParams({
      output_properties:
        '["$distinct_id", "name", "$email", "$ae_first_app_open_date","$android_app_version", "$ios_app_release","$last_seen"]',
      where: `"${data}" in properties["$email"] or "${data}" in properties["$name"]`,
    }),
  };

  const result = await fetch(`https://eu.mixpanel.com/api/2.0/engage?project_id=${prefs.project_id}`, options)
    .then((response) => response.json())
    .catch((err) => console.error(err));

  try {
    return (result as { results: any[] }).results?.map(parseUser) ?? [];
  } catch (err) {
    console.error(`Failed to parse users: ${err}`);
    return [];
  }
}
