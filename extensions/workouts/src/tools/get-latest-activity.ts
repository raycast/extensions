import { withAccessToken } from "@raycast/utils";
import { getActivities, provider } from "../api/client";

export default withAccessToken(provider)(async () => {
  const activities = await getActivities(1, 1);

  return activities?.[0];
});
