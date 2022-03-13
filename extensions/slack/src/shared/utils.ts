import { closeMainWindow, open } from "@raycast/api";

// https://api.slack.com/reference/deep-linking
const openChat = (workspaceId: string, userId: string) => {
  open(`slack://user?team=${workspaceId}&id=${userId}`);
  closeMainWindow();
};

const openChannel = (workspaceId: string, channelId: string) => {
  open(`slack://channel?team=${workspaceId}&id=${channelId}`);
  closeMainWindow();
};

export { openChat, openChannel };
