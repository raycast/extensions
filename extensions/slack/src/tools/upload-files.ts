import { getSlackWebClient, slack } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";
import { getAiMessageBlocks } from "./message-signature";
import { access } from "node:fs/promises";
import path from "node:path";

type Input = {
  /**
   * The Slack conversation ID to send the files to. Conversation IDs start with C, D, or G; never pass a U or W user ID. To send files to a person, first use Read Conversation with their user ID, then pass its returned channel ID.
   *
   * @example "C12345678"
   */
  channel: string;
  /**
   * Absolute local paths of the files to upload, one path per line. Use the path from an attachment supplied by the user when available.
   */
  filePaths: string;
  /**
   * Optional message text to send with the files. Slack mrkdwn is supported. Omit it to send only the files.
   */
  text?: string;
  /**
   * Optional timestamp of the parent message when the files should be posted as a thread reply. Never use a reply's timestamp.
   *
   * @example "1718899200.000100"
   */
  threadTs?: string;
};

type FileShare = {
  ts?: string;
};

type FileShares = {
  public?: Record<string, FileShare[]>;
  private?: Record<string, FileShare[]>;
};

const CONVERSATION_ID_PATTERN = /^[CDG][A-Z0-9]{8,}$/;
const MESSAGE_TIMESTAMP_PATTERN = /^\d+\.\d+$/;

async function uploadFiles(input: Input) {
  return performUploadFiles(input);
}

async function performUploadFiles(input: Input, retried = false) {
  const channel = input.channel.trim();
  if (!CONVERSATION_ID_PATTERN.test(channel)) {
    throw new Error("Invalid Slack conversation ID");
  }

  const threadTs = input.threadTs?.trim();
  if (threadTs && !MESSAGE_TIMESTAMP_PATTERN.test(threadTs)) {
    throw new Error("Invalid Slack thread timestamp");
  }

  const text = input.text?.trim();
  const filePaths = input.filePaths
    .split(/\r?\n/)
    .map((filePath) => filePath.trim())
    .filter(Boolean);
  if (filePaths.length === 0) {
    throw new Error("At least one file path is required");
  }

  for (const filePath of filePaths) {
    if (!path.isAbsolute(filePath)) {
      throw new Error(`File path must be absolute: ${filePath}`);
    }

    try {
      await access(filePath);
    } catch {
      throw new Error(`File not found or unreadable: ${filePath}`);
    }
  }

  const messageBlocks = text ? getAiMessageBlocks(text) : undefined;

  const slackWebClient = getSlackWebClient();
  let response;

  try {
    response = await slackWebClient.filesUploadV2({
      channel_id: channel,
      ...(threadTs ? { thread_ts: threadTs } : {}),
      ...(messageBlocks ? { blocks: messageBlocks } : text ? { initial_comment: text } : {}),
      file_uploads: filePaths.map((filePath) => ({
        file: filePath,
        filename: path.basename(filePath),
        title: path.basename(filePath),
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("missing_scope") && !retried) {
      const isUsingOAuth = !!(await slack.client.getTokens());
      if (isUsingOAuth) {
        await slack.client.removeTokens();
        return withSlackClient((input: Input) => performUploadFiles(input, true))(input);
      }
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(response.error || "Slack failed to upload the files");
  }

  const files = response.files.flatMap((completion) => completion.files ?? []);
  const messageTs = files
    .flatMap((file) => {
      const shares = file.shares as FileShares | undefined;
      return [...Object.values(shares?.public ?? {}).flat(), ...Object.values(shares?.private ?? {}).flat()];
    })
    .find((share) => share.ts)?.ts;

  const permalinkResponse = messageTs
    ? await slackWebClient.chat.getPermalink({ channel, message_ts: messageTs })
    : undefined;

  return {
    channel,
    threadTs,
    text,
    files: files.map((file) => ({
      id: file.id,
      name: file.name,
      title: file.title,
      permalink: file.permalink,
    })),
    permalink: permalinkResponse?.ok ? permalinkResponse.permalink : undefined,
  };
}

export default withSlackClient(uploadFiles);
