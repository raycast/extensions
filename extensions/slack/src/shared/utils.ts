import { open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { CodedError, ErrorCode } from "@slack/web-api";
import { formatDistance } from "date-fns";
import { slack } from "./client/WebClient";
import * as emoji from "node-emoji";

function convertSlackEmojiToUnicode(text: string): string {
  return emoji.emojify(text);
}

const timeDifference = (date: Date): string => {
  const now = new Date();

  const nowMs = now.getTime();
  const dateMs = date.getTime();

  const distance = formatDistance(nowMs, dateMs, { includeSeconds: true });

  return dateMs <= nowMs ? `${distance} ago` : `in ${distance}`;
};

const convertTimestampToDate = (ts: string) => {
  const [seconds, microseconds] = ts.split(".").map(Number);
  const milliseconds = seconds * 1000 + Math.floor(microseconds / 1000);
  return new Date(milliseconds);
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

const isCodedError = (error: unknown): error is CodedError => {
  return typeof error === "object" && error !== null && "code" in error && "message" in error;
};

const handleError = async (error: CodedError | Error | unknown, title?: string) => {
  if (isCodedError(error)) {
    if (error.code === ErrorCode.RateLimitedError) {
      return showFailureToast(error, {
        title: "You've been rate-limited.",
        message: "Please try again in a few seconds/minutes.",
      });
    }

    if (error.message.includes("missing_scope")) {
      const isUsingOAuth = !!(await slack.client.getTokens());

      return showFailureToast(error, {
        title: "Missing Scopes",
        message: "Please make sure your Slack app has all of the required scopes.",
        primaryAction: isUsingOAuth
          ? {
              title: "Re-authorize Slack",
              onAction: async () => {
                await slack.client.removeTokens();
                await slack.authorize();
              },
            }
          : {
              title: "Open Slack Apps",
              onAction: () => {
                open("https://api.slack.com/apps");
              },
            },
      });
    }
  }

  return showFailureToast(error, { title: title ?? "Something unexpected happened" });
};

const isValidChannelId = (channelId?: string) => {
  if (channelId == null) return false;

  const channelIdRegex = /^C[A-Z0-9]{8,}$/;

  return channelIdRegex.test(channelId.trim());
};

export {
  timeDifference,
  convertTimestampToDate,
  buildScriptEnsuringSlackIsRunning,
  handleError,
  convertSlackEmojiToUnicode,
  isValidChannelId,
};
