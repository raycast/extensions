import { executeSQL } from "@raycast/utils";
import { getDbPath } from "./db";
import { Transcript } from "./types";
import { getDisplayText } from "./utils";

type TranscriptTextRow = Pick<
  Transcript,
  "editedText" | "formattedText" | "asrText"
>;

const LATEST_TRANSCRIPT_QUERY = `
  SELECT editedText, formattedText, asrText
  FROM History
  WHERE (isArchived = 0 OR isArchived IS NULL)
    AND (
      (editedText IS NOT NULL AND TRIM(editedText) != '')
      OR (formattedText IS NOT NULL AND TRIM(formattedText) != '')
      OR (asrText IS NOT NULL AND TRIM(asrText) != '')
    )
  ORDER BY timestamp DESC
  LIMIT 1
`;

export async function getLatestTranscript(
  dbPath = getDbPath(),
): Promise<TranscriptTextRow | null> {
  const [transcript] = await executeSQL<TranscriptTextRow>(
    dbPath,
    LATEST_TRANSCRIPT_QUERY,
  );

  return transcript ?? null;
}

export async function getLatestTranscriptText(
  dbPath = getDbPath(),
): Promise<string | null> {
  const latestTranscript = await getLatestTranscript(dbPath);

  if (!latestTranscript) {
    return null;
  }

  const displayText = getDisplayText(latestTranscript).trim();
  return displayText.length > 0 ? displayText : null;
}
