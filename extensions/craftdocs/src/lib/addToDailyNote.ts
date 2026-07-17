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
