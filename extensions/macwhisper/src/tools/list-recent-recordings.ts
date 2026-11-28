import { getPreferenceValues } from "@raycast/api";
import { formatBytes, parseFolders, recentRecordings } from "../lib/files";

type Input = {
  /** How many recordings to return, newest first. Defaults to 5. */
  limit?: number;
};

/**
 * Lists the most recent audio and video files in the user's recording folders (Downloads, Desktop, Movies, Zoom… as
 * configured), newest first. Use it to find "my latest recording" before calling transcribe-audio.
 */
export default async function tool(input: Input) {
  const { recordingFolders } = getPreferenceValues<Preferences>();
  const folders = parseFolders(recordingFolders);
  const limit = Math.min(Math.max(Math.round(input.limit ?? 5), 1), 25);
  const recordings = await recentRecordings(folders, limit);
  return {
    searchedFolders: folders,
    recordings: recordings.map((recording) => ({
      path: recording.path,
      name: recording.name,
      modifiedAt: recording.modifiedAt.toISOString(),
      size: formatBytes(recording.sizeBytes),
    })),
  };
}
