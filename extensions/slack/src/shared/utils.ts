import { closeMainWindow, open } from "@raycast/api";
import formatDistance from "date-fns/formatDistance";

// https://api.slack.com/reference/deep-linking
const openChat = (workspaceId: string, userId: string) => {
  open(`slack://user?team=${workspaceId}&id=${userId}`);
  closeMainWindow();
};

const openChannel = (workspaceId: string, channelId: string) => {
  open(`slack://channel?team=${workspaceId}&id=${channelId}`);
  closeMainWindow();
};

const timeDifference = (date: Date): string => {
  const now = new Date();

  const nowMs = now.getTime();
  const dateMs = date.getTime();

  const distance = formatDistance(nowMs, dateMs, { includeSeconds: true });

  return dateMs <= nowMs ? `${distance} ago` : `in ${distance}`;
};

const buildScriptEnsuringSlackIsRunning = (commandsToRunAfterSlackIsRunning: string): string => {
  return `
    tell application "Slack"
      if not application "Slack" is running then
        activate
        set _maxOpenWaitTimeInSeconds to 5
        set _openCounter to 0
        repeat until application "Slack" is running
          delay 0.5
          set _openCounter to _openCounter + 0.5
          if _openCounter > _maxOpenWaitTimeInSeconds then exit repeat
        end repeat

        delay 6

        # Exit 'Set yourself to active?' window
        activate
        tell application "System Events"
          key code 53
        end tell
      end if
      activate
      ${commandsToRunAfterSlackIsRunning}
    end tell`;
};

export { openChat, openChannel, timeDifference, buildScriptEnsuringSlackIsRunning };
