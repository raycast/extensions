import { withAccessToken } from "@raycast/utils";
import { linear } from "../api/linearClient";
import { getNotifications } from "../api/getNotifications";

export default withAccessToken(linear)(async () => {
  const { notifications } = await getNotifications();

  return notifications;
});
