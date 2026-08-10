import { getPreferenceValues } from "@raycast/api";
import { incidentSchema } from "../api/schema";

export default async function () {
  const { access_token } = getPreferenceValues<Preferences>();
  const response = await fetch("https://api.openstatus.dev/v1/incident", {
    headers: {
      "x-openstatus-key": `${access_token}`,
    },
  });
  if (!response.ok) throw new Error(response.statusText);
  const result = await response.json();
  return incidentSchema.array().parse(result);
}
