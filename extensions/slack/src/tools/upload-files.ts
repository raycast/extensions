import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";
import { access } from "node:fs/promises";
import path from "node:path";

type Input = {
  /**
   * The Slack conversation ID to send the files to. Conversation IDs start with C, D, or G. To send files in a DM, resolve the user's DM conversation ID first with Send Message or Read Conversation.
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

const CONVERSATION_ID_PATTERN = /^[CDG][A-Z0-9]{8,}$/;
const MESSAGE_TIMESTAMP_PATTERN = /^\d+\.\d+$/;

async function uploadFiles(input: Input) {
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

  const slackWebClient = getSlackWebClient();
  const response = await slackWebClient.filesUploadV2({
    channel_id: channel,
    ...(threadTs ? { thread_ts: threadTs } : {}),
    ...(text ? { initial_comment: text } : {}),
    file_uploads: filePaths.map((filePath) => ({
      file: filePath,
      filename: path.basename(filePath),
      title: path.basename(filePath),
    })),
  });

  if (!response.ok) {
    throw new Error(response.error || "Slack failed to upload the files");
  }

  const files = response.files.flatMap((completion) => completion.files ?? []);
  const messageTs = files
    .flatMap((file) => Object.values(file.shares?.public ?? {}).flat())
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
