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
`;

function buildLatestTranscriptQuery(minDuration: number): string {
  const durationCondition =
    minDuration > 0 ? `AND duration >= ${minDuration}` : "";

  return `${LATEST_TRANSCRIPT_QUERY}
  ${durationCondition}
  ORDER BY timestamp DESC
  LIMIT 1`;
}

export async function getLatestTranscript(
  dbPath = getDbPath(),
  minimumDuration = 0,
): Promise<TranscriptTextRow | null> {
  const minDuration = Number(minimumDuration) || 0;
  const [transcript] = await executeSQL<TranscriptTextRow>(
    dbPath,
    buildLatestTranscriptQuery(minDuration),
  );

  return transcript ?? null;
}

export async function getLatestTranscriptText(
  dbPath = getDbPath(),
  minimumDuration = 0,
): Promise<string | null> {
  const latestTranscript = await getLatestTranscript(dbPath, minimumDuration);

  if (!latestTranscript) {
    return null;
  }

  const displayText = getDisplayText(latestTranscript).trim();
  return displayText.length > 0 ? displayText : null;
}
