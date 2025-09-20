import { withAccessToken } from "@raycast/utils";
import { getActivities, provider } from "../api/client";

export default withAccessToken(provider)(async () => {
  const activities = await getActivities(1, 100);

  const cleanedActivities =
    activities?.map((activity) => {
      const { map, ...rest } = activity; // eslint-disable-line @typescript-eslint/no-unused-vars
      return rest;
    }) || [];

  return cleanedActivities;
});
