import { formatTime } from "../utils/dateTimeFormatter";

export type AddToDailyNoteAction = "append" | "open-daily-note" | "submit";

export const resolveAddToDailyNoteAction = ({
  content,
  spaceId,
  dailyNoteBlockId,
}: {
  content: string;
  spaceId: string;
  dailyNoteBlockId: string | null;
}): AddToDailyNoteAction => {
  if (!content.trim() || !spaceId) {
    return "submit";
  }

  if (dailyNoteBlockId) {
    return "append";
  }

  return "open-daily-note";
};

export const formatDailyNoteContent = (content: string, preferences: Preferences): string => {
  const prefix = preferences.addTimestamp
    ? `**${formatTime(new Date(), preferences.timeFormat)}**${preferences.contentPrefix}`
    : preferences.contentPrefix;

  return `${prefix}${content}${preferences.contentSuffix}`;
};
