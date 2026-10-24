import { performDirectMessageAction } from "./client/directMessage";
import { getSlackWebClient } from "./client/WebClient";
import { handleError } from "./utils";

export function directMessageAction(
  userId: string,
  conversationId: string | undefined,
  action: (id: string) => Promise<void>,
) {
  return performDirectMessageAction(
    userId,
    conversationId,
    (args) => getSlackWebClient().conversations.open(args),
    action,
    (error) => handleError(error, "Failed to open Slack direct message"),
  );
}
