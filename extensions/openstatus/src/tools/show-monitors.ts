import { getPreferenceValues } from "@raycast/api";
import { monitorSchema } from "../api/schema";

export default async function () {
  const { access_token } = getPreferenceValues<Preferences>();
  const response = await fetch("https://api.openstatus.dev/v1/monitor", {
    headers: {
      "x-openstatus-key": `${access_token}`,
    },
  });
  if (!response.ok) throw new Error(response.statusText);
  const result = await response.json();
  return monitorSchema.array().parse(result);
}
