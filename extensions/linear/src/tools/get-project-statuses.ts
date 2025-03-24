import { withAccessToken } from "@raycast/utils";
import { getLinearClient, linear } from "../api/linearClient";

export default withAccessToken(linear)(async () => {
  const { linearClient } = getLinearClient();

  return (await linearClient.organization).projectStatuses;
});
