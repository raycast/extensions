import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { CodedError, ErrorCode } from "@slack/web-api";
import { formatDistance } from "date-fns";
import { slack } from "./client/WebClient";
import { formatRetryAfter, getRetryAfter, isRateLimitError, slackRateLimitDocumentationUrl } from "./client/rateLimit";
import * as emoji from "node-emoji";
import { canReauthorizeSlack, getMissingScopeDetails } from "./client/permissions";
import { parseSlackTimestamp } from "./client/presentation";

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
  return parseSlackTimestamp(ts);
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
  const retryAfter = getRetryAfter(error);
  const rateLimited = (isCodedError(error) && error.code === ErrorCode.RateLimitedError) || isRateLimitError(error);

  if (rateLimited) {
    return showFailureToast(error, {
      title: "Slack rate limit exceeded",
      message: retryAfter
        ? `Slack asked us to wait ${formatRetryAfter(retryAfter)}. Please try again after that.`
        : "Slack is temporarily limiting requests. Please wait and try again.",
      primaryAction: {
        title: "View Slack Rate Limits",
        onAction: () => open(slackRateLimitDocumentationUrl),
      },
    });
  }

  const missingScope = getMissingScopeDetails(error);
  if (missingScope) {
    const { accessToken } = getPreferenceValues<Preferences>();
    const isUsingOAuth = canReauthorizeSlack(accessToken, !!(await slack.client.getTokens()));

    return showFailureToast(error, {
      title: "Slack permission required",
      message: [
        missingScope.needed ? `Required: ${missingScope.needed}.` : "Your Slack token is missing required permissions.",
        isUsingOAuth
          ? "Re-authorize Slack, then reopen this command."
          : "Add the scopes to your Slack app, reinstall it to the workspace, and update the access token in preferences.",
      ].join(" "),
      primaryAction: isUsingOAuth
        ? {
            title: "Re-authorize Slack",
            onAction: async () => {
              try {
                await slack.client.removeTokens();
                await slack.authorize();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Slack re-authorized",
                  message: "Reopen the command to try again.",
                });
              } catch (error) {
                await showFailureToast(error, { title: "Could not re-authorize Slack" });
              }
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

  return showFailureToast(error, { title: title ?? "Something unexpected happened" });
};

const isValidChannelId = (channelId?: string) => {
  if (channelId == null) return false;

  const channelIdRegex = /^C[A-Z0-9]{8,}$/;

  return channelIdRegex.test(channelId.trim());
};

type SlackFileLike = {
  id?: string;
  name?: string;
  title?: string;
  mimetype?: string;
  filetype?: string;
  size?: number;
};

type FormattedSlackFile = {
  id: string;
  name?: string;
  mimetype?: string;
  size?: number;
};

/**
 * Normalizes a message's `files` array into a compact shape the AI can act on.
 * The `id` values can be passed to the Download Files tool. Returns `undefined`
 * when a message has no downloadable files so the key can be omitted.
 */
const formatSlackFiles = (files?: SlackFileLike[]): FormattedSlackFile[] | undefined => {
  const formatted = (files ?? [])
    .filter((file): file is SlackFileLike & { id: string } => Boolean(file.id))
    .map((file) => ({
      id: file.id,
      name: file.name ?? file.title,
      mimetype: file.mimetype ?? file.filetype,
      size: file.size,
    }));

  return formatted.length > 0 ? formatted : undefined;
};

export {
  timeDifference,
  convertTimestampToDate,
  buildScriptEnsuringSlackIsRunning,
  handleError,
  convertSlackEmojiToUnicode,
  isValidChannelId,
  formatSlackFiles,
};

type MessageWithContent = {
  text?: string;
  attachments?: { pretext?: string; title?: string; text?: string; fallback?: string }[];
  blocks?: { text?: { text?: string } }[];
};

/**
 * Extracts the text content of a message. Bot/webhook messages (e.g. IFTTT tweet streams)
 * often have an empty top-level `text` with the actual content living in `attachments` or `blocks`.
 */
export function getMessageText(message: MessageWithContent) {
  if (message.text) {
    return message.text;
  }

  const attachmentText = message.attachments
    ?.map(
      (attachment) =>
        [attachment.pretext, attachment.title, attachment.text].filter(Boolean).join("\n") || attachment.fallback,
    )
    .filter(Boolean)
    .join("\n\n");
  if (attachmentText) {
    return attachmentText;
  }

  return message.blocks
    ?.map((block) => block.text?.text)
    .filter(Boolean)
    .join("\n");
}
