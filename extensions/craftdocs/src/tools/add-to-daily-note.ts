import { Clipboard, getPreferenceValues, open, Tool } from "@raycast/api";
import { formatDailyNoteContent } from "../lib/addToDailyNote";
import {
  buildCreateBlockUrl,
  findDailyNoteBlockIdFresh,
  loadCraftSnapshot,
  parseLocalDate,
  resolveSpaceId,
  waitForDailyNote,
} from "../lib/aiTools";
import { buildDailyNoteOpenUrl } from "../lib/dailyNotes";

type Input = {
  /** Markdown content to add to the Daily Note. */
  content: string;
  /** Daily Note date as YYYY-MM-DD. Defaults to today. */
  date?: string;
  /** Space ID to use. Omit for the primary space. */
  spaceId?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Add this to the Daily Note in Craft?",
  info: [
    { name: "Content", value: input.content },
    { name: "Date", value: input.date ?? "today" },
    { name: "Space", value: input.spaceId },
    {
      name: "Note",
      value:
        "If the Daily Note doesn't exist yet, Craft opens to create it. If it isn't indexed in time, the content is copied to your clipboard instead.",
    },
  ],
});

/** Add content to a Daily Note in Craft, creating the note if needed. Uses the user's timestamp, prefix, suffix and position settings. */
export default async function (input: Input) {
  const preferences = getPreferenceValues<Preferences>();
  const { config } = await loadCraftSnapshot();
  const spaceId = resolveSpaceId(config, input.spaceId);
  const date = parseLocalDate(input.date);
  const content = formatDailyNoteContent(input.content, preferences);

  let dailyNoteBlockId = await findDailyNoteBlockIdFresh(config, spaceId, date);

  if (!dailyNoteBlockId) {
    // Opening a Daily Note in Craft creates it.
    await open(buildDailyNoteOpenUrl(input.date ?? "today", spaceId));
    dailyNoteBlockId = await waitForDailyNote(config, spaceId, date);
  }

  if (!dailyNoteBlockId) {
    await Clipboard.copy(content);
    return "Opened the Daily Note in Craft, but it hasn't appeared in Craft's local index yet, so the content couldn't be inserted. The content was copied to the clipboard; tell the user to paste it, or retry in a few seconds.";
  }

  await open(
    buildCreateBlockUrl({ parentBlockId: dailyNoteBlockId, spaceId, content, position: preferences.appendPosition }),
  );

  return "Added to the Daily Note.";
}
