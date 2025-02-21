import { withAccessToken } from "@raycast/utils";
import { getClubs, provider } from "../api/client";

export default withAccessToken(provider)(async () => {
  const clubs = await getClubs();

  return clubs;
});
