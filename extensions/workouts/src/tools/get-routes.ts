import { withAccessToken } from "@raycast/utils";
import { getRoutes, provider } from "../api/client";

export default withAccessToken(provider)(async () => {
  const routes = await getRoutes();

  return routes;
});
