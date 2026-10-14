import { XMLParser } from "fast-xml-parser";
import * as z from "zod";
import { APP_URL } from "../../constants/raycast";
import { INLINE_SOURCE_REGEX, PARTIAL_INLINE_SOURCE_REGEX, SAVED_SOURCE_REGEX } from "../../constants/assistant";
import { getActionDisplay, getThinkingDurationText, getThinkingWord } from "./action";
import { getChatSources, getTurns } from "./chat";
import { canRenderText, fitsRow, loadRenderer, renderRow, renderSourcePill } from "./image";

type Turn = ReturnType<typeof getTurns>[number];
type Source = ReturnType<typeof getChatSources>[number];
type Renderer = Awaited<ReturnType<typeof loadRenderer>>;
type Row = Parameters<typeof renderRow>[0];

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  htmlEntities: true,
  isArray: (tagName) => tagName === "meeting",
});

const SavedMeetingSchema = z.union([
  z.object({ name: z.string(), id: z.string() }).transform(({ name, id }) => ({ name, meetingId: id })),
  // Chats saved before Meeting.linkId was renamed to id still use linkId.
  z.object({ name: z.string(), linkId: z.string() }).transform(({ name, linkId }) => ({ name, meetingId: linkId })),
]);
const SavedSourceSchema = z.object({
  source: z.object({ meeting: z.array(SavedMeetingSchema).optional() }),
});

export const removeSources = (answer: string) =>
  answer.replace(PARTIAL_INLINE_SOURCE_REGEX, "").replace(INLINE_SOURCE_REGEX, "").replace(SAVED_SOURCE_REGEX, "");

const getCitedMeetings = (answer: string, sources: Source[]) => {
  const streamedMeetings = [...answer.matchAll(INLINE_SOURCE_REGEX)].flatMap(({ 1: sourceId }) => {
    const source = sources.find((source) => source.sourceId === sourceId);
    return source?.meetingId ? [{ name: source.name, meetingId: source.meetingId }] : [];
  });
  const savedMeetings = [...answer.matchAll(SAVED_SOURCE_REGEX)].flatMap(
    ([block]) => SavedSourceSchema.safeParse(xmlParser.parse(block)).data?.source.meeting ?? [],
  );
  const meetings = [...streamedMeetings, ...savedMeetings];
  return [...new Map(meetings.map((meeting) => [meeting.meetingId, meeting])).values()];
};

const getStatusRow = (turn: Turn, isWorking: boolean): Row | undefined => {
  const actions = turn.actions.filter((action) => !action.isFailed);
  const lastAction = actions.at(-1);
  const durationMs = lastAction?.actionGroupDurationMs;
  const row = { tone: "status", isShimmering: isWorking } satisfies Omit<Row, "text">;
  if (isWorking && !lastAction) return { ...row, text: getThinkingWord(turn.id) };
  if (!isWorking && actions.length > 1 && durationMs !== undefined) {
    return { ...row, text: getThinkingDurationText(durationMs) };
  }
  return lastAction && { ...row, ...getActionDisplay(lastAction, isWorking) };
};

export const getTurnView = ({
  turn,
  answer,
  isLoading,
  sources,
}: {
  turn: Turn;
  answer: string;
  isLoading: boolean;
  sources: Source[];
}) => {
  const questionRow: Row = { text: turn.question, tone: "question" };
  const statusRow = getStatusRow(turn, isLoading && answer.length === 0);
  return {
    rows: statusRow ? [questionRow, statusRow] : [questionRow],
    answer: removeSources(answer),
    emailDrafts: turn.emailDrafts,
    notices: isLoading ? [] : turn.notices,
    citedMeetings: isLoading ? [] : getCitedMeetings(turn.answer, sources),
  };
};

type TurnView = ReturnType<typeof getTurnView>;

const getImageMarkdown = ({ frames, width, height }: ReturnType<typeof renderRow>, frameIndex = 0) =>
  `![](${frames[frameIndex % frames.length]}?raycast-width=${width}&raycast-height=${height})`;

const getEmailDraftMarkdown = ({ to, subject, body }: TurnView["emailDrafts"][number]) =>
  [`**To:** ${to.join(", ")}`, `**Subject:** ${subject}`, body].filter(Boolean).join("\n\n");

// A question too long for one row shows as text so it keeps its ending.
const canRenderRow = (row: Row, renderer: Renderer) =>
  canRenderText(row.text) && (row.tone === "status" || fitsRow(row.text, renderer));

export const getTurnMarkdown = (
  { rows, answer, emailDrafts, notices, citedMeetings }: TurnView,
  renderer: Renderer | undefined,
  frameIndex: number,
) => {
  const rowsMarkdown = rows.map((row) =>
    renderer && canRenderRow(row, renderer) ? getImageMarkdown(renderRow(row, renderer), frameIndex) : `*${row.text}*`,
  );
  // Raycast doesn't open app links like circleback:// from markdown, so pills
  // open the web app.
  const sourcePills = citedMeetings.map(
    ({ name, meetingId }) =>
      `[${renderer && canRenderText(name) ? getImageMarkdown(renderSourcePill(name, renderer)) : name}](${APP_URL}/meetings/${meetingId})`,
  );
  const noticesMarkdown = notices.map((notice) => `> ${notice}`);
  return [...rowsMarkdown, answer, ...emailDrafts.map(getEmailDraftMarkdown), ...noticesMarkdown, sourcePills.join(" ")]
    .filter(Boolean)
    .join("\n\n");
};
