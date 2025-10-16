/**
 * Slack API integration module.
 * Provides functions for interacting with Slack's Web API and managing message templates.
 */
import { WebClient } from "@slack/web-api";
import { showToast, Toast } from "@raycast/api";
import { OAuthService, showFailureToast } from "@raycast/utils";
import { Channel } from "../types";

/** Slack API error codes for channel-related operations */
export const SLACK_API_ERROR_CODES = {
  NOT_IN_CHANNEL: "not_in_channel",
  CHANNEL_NOT_FOUND: "channel_not_found",
} as const;

/**
 * Extended Error type for Slack API errors
 */
interface SlackError extends Error {
  data?: {
    error: string;
  };
}

/**
 * Common options for displaying toast notifications
 */
interface ToastOptions {
  style: Toast.Style;
  title: string;
  message?: string;
}

/** OAuth configuration for Slack API access */
export const slack = OAuthService.slack({
  scope: "chat:write channels:read groups:read channels:history groups:history",
});

/**
 * Replaces template variables in a message with their actual values
 * @param message - The message template containing variables
 * @param client - Authenticated Slack Web API client
 * @returns Promise<string> The processed message with variables replaced
 *
 * Supported variables:
 * - {date} - Current date in YYYY-MM-DD format (e.g., 2024-02-23)
 * - {time} - Current time in HH:mm format (e.g., 14:30)
 * - {user} - Current Slack user name (obtained from auth.test)
 *
 * Example:
 * "Meeting at {time} on {date} by {user}" ->
 * "Meeting at 14:30 on 2024-02-23 by JohnDoe"
 */
export async function replaceTemplateVariables(message: string, client: WebClient): Promise<string> {
  const now = new Date();
  let userName = "unknown";
  try {
    const userInfo = await client.auth.test();
    userName = userInfo.user || "unknown";
  } catch (error) {
    console.error("Failed to get user info:", error);
  }

  const variables: { [key: string]: string } = {
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().slice(0, 5),
    user: userName,
  };

  return message.replace(/\{([^}]+)\}/g, (match, key) => {
    return variables[key] || match;
  });
}

/**
 * Validates and normalizes a thread timestamp
 * @param threadTs - Thread timestamp to validate
 * @param channelId - ID of the channel containing the thread
 * @param client - Authenticated Slack Web API client
 * @returns Promise<string | undefined> Normalized thread timestamp or undefined
 * @throws Error if thread ID is invalid or not found
 *
 * Thread timestamp format:
 * - Input can be with or without 'p' prefix
 * - Can be all numbers or numbers with decimal point
 * - Will be normalized to "XXXXXXXXXX.YYYYYY" format
 *
 * Example formats accepted:
 * - "1234567890.123456"  -> "1234567890.123456"
 * - "p1234567890123456"  -> "1234567890.123456"
 * - "1234567890123456"   -> "1234567890.123456"
 */
export async function validateAndNormalizeThreadTs(
  threadTs: string | undefined,
  channelId: string,
  client: WebClient,
): Promise<string | undefined> {
  // Return undefined if threadTs is empty or only whitespace
  if (!threadTs?.trim()) {
    return undefined;
  }

  // Step 1: Remove 'p' prefix if exists
  let normalizedTs = threadTs.trim();
  if (normalizedTs.startsWith("p")) {
    normalizedTs = normalizedTs.slice(1);
  }

  // Step 2: Convert pure numeric string to timestamp format
  if (/^\d+$/.test(normalizedTs)) {
    const len = normalizedTs.length;
    // If length > 6, insert decimal point 6 digits from the end
    if (len > 6) {
      normalizedTs = `${normalizedTs.slice(0, len - 6)}.${normalizedTs.slice(len - 6)}`;
    }
  }

  // Step 3: Validate final format (must be numbers with decimal point)
  if (!/^\d+\.\d+$/.test(normalizedTs)) {
    throw new Error("Thread ID must contain only numbers");
  }

  // Step 4: Verify thread exists in the channel
  try {
    const threadInfo = await client.conversations.replies({
      channel: channelId,
      ts: normalizedTs,
      limit: 1,
    });
    if (!threadInfo.messages?.length) {
      throw new Error("Thread not found");
    }
  } catch (error) {
    throw new Error("The specified thread does not exist in this channel");
  }

  return normalizedTs;
}

/**
 * Sends a message to a Slack channel
 * @param token - Slack API token
 * @param channelId - ID of the target channel
 * @param message - Message content to send
 * @param threadTs - Optional thread timestamp for reply
 */
export async function sendMessage(token: string, channelId: string, message: string, threadTs?: string) {
  const client = new WebClient(token);

  try {
    const processedMessage = await replaceTemplateVariables(message, client);

    await client.chat.postMessage({
      channel: channelId,
      text: processedMessage,
      thread_ts: threadTs && threadTs.trim() !== "" ? threadTs : undefined,
    });

    await showCustomToast({
      style: Toast.Style.Success,
      title: "Message sent successfully",
    });
  } catch (error) {
    const errorTitle = "Failed to send message";
    const slackError = error as SlackError;

    if (slackError.data?.error === SLACK_API_ERROR_CODES.NOT_IN_CHANNEL) {
      await showFailureToast("You need to join the channel before sending messages", { title: errorTitle });
    } else if (slackError.data?.error === SLACK_API_ERROR_CODES.CHANNEL_NOT_FOUND) {
      await showFailureToast("Channel not found", { title: errorTitle });
    } else {
      await showFailureToast(error, { title: errorTitle });
    }
  }
}

/**
 * Shows a custom toast notification
 * @param options - Toast notification options
 */
export async function showCustomToast(options: ToastOptions): Promise<void> {
  await showToast({
    style: options.style,
    title: options.title,
    message: options.message,
  });
}

/**
 * Fetches all accessible Slack channels
 * @param client - Authenticated Slack Web API client
 * @returns Promise<Channel[]> Array of channel information
 */
export async function fetchAllChannels(client: WebClient): Promise<Channel[]> {
  try {
    const allChannels: Channel[] = [];
    let cursor: string | undefined;

    do {
      const result = await client.conversations.list({
        types: "public_channel,private_channel",
        exclude_archived: true,
        limit: 1000,
        cursor: cursor,
      });

      if (result.channels) {
        const channelList = result.channels
          .filter((channel) => channel.id && channel.name && !channel.is_archived)
          .map((channel) => ({
            id: channel.id!,
            name: channel.name!,
          }));
        allChannels.push(...channelList);
      }

      cursor = result.response_metadata?.next_cursor;
    } while (cursor);

    return allChannels;
  } catch (error) {
    await showCustomToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch channel list",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    // Return empty array instead of throwing the error to avoid duplicate error handling
    return [];
  }
}
