import { open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { CodedError, ErrorCode } from "@slack/web-api";
import { formatDistance } from "date-fns";

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
      return showFailureToast(error, {
        title: "Missing Scopes",
        message: "Please make sure your Slack app has all of the required scopes.",
        primaryAction: {
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

export { timeDifference, buildScriptEnsuringSlackIsRunning, handleError };
