import { withAccessToken } from "@raycast/utils";

import { getNotifications } from "../api/getNotifications";
import { linear } from "../api/linearClient";

export default withAccessToken(linear)(async () => {
  const { notifications } = await getNotifications();

  return notifications;
});
