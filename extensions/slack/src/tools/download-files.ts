import { getSlackWebClient } from "../shared/client/WebClient";
import { downloadSlackFile } from "../shared/client/downloadFile";
import { shouldRetryAfterMissingScope, withSlackClient } from "../shared/withSlackClient";

type Input = {
  /**
   * Slack file IDs to download, one per line. File IDs start with `F` and can be
   * found in the `files` array returned by Read Conversation, Read Thread, Get
   * Channel History, or Search Messages.
   *
   * @example "F0123456789"
   */
  fileIds: string;
  /**
   * Optional absolute path of the directory to save the files into. Defaults to
   * the user's `~/Downloads` folder. A leading `~` is expanded to the home
   * directory. The directory is created if it does not exist.
   */
  destinationDir?: string;
};

const FILE_ID_PATTERN = /^F[A-Z0-9]{6,}$/i;

async function downloadFiles(input: Input) {
  return performDownloadFiles(input);
}

async function performDownloadFiles(input: Input, retried = false) {
  const fileIds = input.fileIds
    .split(/\r?\n/)
    .map((fileId) => fileId.trim())
    .filter(Boolean);

  if (fileIds.length === 0) {
    throw new Error("At least one file ID is required");
  }

  for (const fileId of fileIds) {
    if (!FILE_ID_PATTERN.test(fileId)) {
      throw new Error(`Invalid Slack file ID: ${fileId}`);
    }
  }

  const slackWebClient = getSlackWebClient();
  const results: { id: string; name: string; path: string; bytes: number }[] = [];

  try {
    for (const fileId of fileIds) {
      const info = await slackWebClient.files.info({ file: fileId });
      if (!info.ok || !info.file) {
        throw new Error(info.error || `Could not fetch file info for ${fileId}`);
      }

      const file = info.file;
      const url = file.url_private_download || file.url_private;
      if (!url) {
        throw new Error(`Slack file ${fileId} has no downloadable URL`);
      }

      const filename = file.name || file.title || fileId;
      const { path: savedPath, bytes } = await downloadSlackFile({
        url,
        filename,
        destinationDir: input.destinationDir,
      });

      results.push({ id: fileId, name: filename, path: savedPath, bytes });
    }
  } catch (error) {
    if (await shouldRetryAfterMissingScope(error, retried)) {
      return withSlackClient((input: Input) => performDownloadFiles(input, true))(input);
    }
    throw error;
  }

  return { files: results };
}

export default withSlackClient(downloadFiles);
