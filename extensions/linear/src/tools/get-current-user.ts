import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";

export default withAccessToken(linear)(async () => {
  const { linearClient } = getLinearClient();

  const user = await linearClient.client.rawRequest(`
    query {
      viewer {
        id
        name
        email
        avatarUrl
      }
    }
  `);

  return user;
});
