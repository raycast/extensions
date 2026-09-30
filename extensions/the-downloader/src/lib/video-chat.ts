import { Engine } from "./ai-engines.js";
import {
  VideoContext,
  captionLanguages,
  chunkSegments,
  dossierMarkdown,
  estimateTokens,
  formatTimestamp,
  isOverviewRequest,
  selectChunks,
  timestampUrl,
  transcriptText,
} from "./video-context.js";

// How a question about a video becomes one or more model requests. The whole
// transcript goes along when it fits; otherwise specific questions get the most
// relevant excerpts, and overview questions ("summarize…") are answered from
// notes taken part by part (map-reduce), so small on-device models still see
// the entire video.

export type ChatTurn = { question: string; answer: string };

export const CHAT_INSTRUCTIONS = [
  "You answer questions about one online video, using the video information and transcript provided.",
  "Base answers on the transcript and metadata. If they don't cover something, say so plainly instead of guessing, and mark any outside knowledge as such.",
  "Point to moments with timestamps in square brackets, like [4:05] or [1:02:30], taken from the transcript lines.",
  "Use Markdown: short paragraphs, bullet lists where they help, bold for key terms. No preamble.",
  "Reply in the language of the question.",
].join(" ");

const PART_INSTRUCTIONS =
  "You take notes on one part of a video transcript. Write 4–8 concise bullet points covering what is said, each starting with the timestamp in square brackets where it happens, e.g. [12:34]. Keep names, numbers and claims exact. No introduction.";

const HISTORY_TURNS = 6;
const HISTORY_ANSWER_CHARS = 1_200;

function historyText(history: ChatTurn[]): string {
  return history
    .slice(-HISTORY_TURNS)
    .map((t) => {
      const answer = t.answer.length > HISTORY_ANSWER_CHARS ? `${t.answer.slice(0, HISTORY_ANSWER_CHARS)}…` : t.answer;
      return `Q: ${t.question}\nA: ${answer}`;
    })
    .join("\n\n");
}

export type PromptPlan = {
  /** `full` sends the whole transcript; `excerpts` only the parts most relevant to the question. */
  mode: "full" | "excerpts";
  prompt: string;
};

/** The prompt for one question, fitted into `budgetTokens`. */
export function buildPrompt(
  ctx: VideoContext,
  question: string,
  history: ChatTurn[],
  budgetTokens: number,
  now = Date.now(),
): PromptPlan {
  const dossier = dossierMarkdown(ctx, now);
  const past = historyText(history);
  const tail = `${past ? `## Conversation so far\n${past}\n\n` : ""}## Question\n${question}`;
  const transcriptBudget = budgetTokens - estimateTokens(dossier) - estimateTokens(tail) - 100;

  if (ctx.segments.length === 0) {
    return {
      mode: "full",
      prompt: `${dossier}\n\n## Transcript\nNo captions are available for this video. Answer from the information above, and say when a question needs the spoken content.\n\n${tail}`,
    };
  }

  const full = transcriptText(ctx.segments);
  if (estimateTokens(full) <= transcriptBudget) {
    return { mode: "full", prompt: `${dossier}\n\n## Transcript\n${full}\n\n${tail}` };
  }

  // The last question helps follow-ups like "tell me more about that".
  const query = [question, history.at(-1)?.question ?? ""].join(" ");
  const chunks = chunkSegments(ctx.segments, 350);
  const picked = selectChunks(chunks, query, Math.max(transcriptBudget, 300));
  const excerpts = picked.map((c) => c.text).join("\n…\n");
  return {
    mode: "excerpts",
    prompt: `${dossier}\n\n## Transcript excerpts\nThe full transcript is longer; these are the parts most relevant to the question.\n${excerpts}\n\n${tail}`,
  };
}

export type AnswerOptions = {
  signal?: AbortSignal;
  onData?: (text: string) => void;
  /** Progress for multi-step answers, e.g. "Reading part 2 of 5…". */
  onStatus?: (status: string | undefined) => void;
  now?: number;
};

/** Answer `question` about the video with `engine`, streaming the text through `onData`. */
export async function answerQuestion(
  engine: Engine,
  ctx: VideoContext,
  question: string,
  history: ChatTurn[],
  options: AnswerOptions = {},
): Promise<string> {
  const plan = buildPrompt(ctx, question, history, engine.contextBudget, options.now);
  if (plan.mode === "excerpts" && isOverviewRequest(question)) {
    return answerFromNotes(engine, ctx, question, options);
  }
  return engine.complete(CHAT_INSTRUCTIONS, plan.prompt, {
    signal: options.signal,
    onData: options.onData,
    onStatus: options.onStatus,
  });
}

/** Facts without the long description, for the part-by-part pass. */
function shortDossier(ctx: VideoContext, now?: number): string {
  return dossierMarkdown(ctx, now, 300);
}

/**
 * Map-reduce for overview questions on small context windows: take notes on
 * each part of the transcript, then answer from the notes.
 */
export async function answerFromNotes(
  engine: Engine,
  ctx: VideoContext,
  question: string,
  options: AnswerOptions = {},
): Promise<string> {
  const facts = shortDossier(ctx, options.now);
  const partBudget = Math.max(800, engine.contextBudget - estimateTokens(facts) - 300);
  const parts = chunkSegments(ctx.segments, partBudget);
  const notes: string[] = [];
  for (const [i, part] of parts.entries()) {
    options.onStatus?.(`Reading part ${i + 1} of ${parts.length}…`);
    const range = `${formatTimestamp(part.start)}–${formatTimestamp(part.end)}`;
    const note = await engine.complete(
      PART_INSTRUCTIONS,
      `${facts}\n\n## Transcript part ${i + 1} of ${parts.length} (${range})\n${part.text}`,
      { signal: options.signal },
    );
    notes.push(`### Part ${i + 1} (${range})\n${note.trim()}`);
  }

  // Keep the notes inside the budget for the final request.
  const noteBudget = Math.max(600, engine.contextBudget - estimateTokens(facts) - estimateTokens(question) - 300);
  const perNote = Math.floor((noteBudget * 4) / Math.max(notes.length, 1));
  const fitted = notes.map((n) => (n.length > perNote ? `${n.slice(0, perNote)}…` : n)).join("\n\n");

  options.onStatus?.("Writing the answer…");
  const answer = await engine.complete(
    CHAT_INSTRUCTIONS,
    `${facts}\n\n## Notes on the transcript, part by part\n${fitted}\n\n## Question\n${question}`,
    { signal: options.signal, onData: options.onData },
  );
  options.onStatus?.(undefined);
  return answer;
}

/** The full context as Markdown, for "Copy Video Context" — paste it into any AI chat. */
export function contextForExport(ctx: VideoContext, now = Date.now()): string {
  return `${dossierMarkdown(ctx, now, 5_000)}\n\n## Transcript\n${transcriptText(ctx.segments)}\n`;
}

/** How to link a moment, for models answering from the tool output. */
function momentLinkLine(ctx: Pick<VideoContext, "url" | "video">): string {
  const at = (s: number) => timestampUrl(ctx, s);
  return at(0) ? `\n\nLink to a moment with its offset in seconds, e.g. [4:05](${at(245)}).` : "";
}

/** The `get-video-info` tool's answer: facts, statistics, chapters, tags, description and caption languages. */
export function videoInfoForAI(ctx: Pick<VideoContext, "url" | "video">, now = Date.now()): string {
  const langs = captionLanguages(ctx.video);
  const captions = [
    langs.uploaded.length ? `- Uploaded captions: ${langs.uploaded.join(", ")}` : "",
    langs.automatic.length
      ? `- Automatic captions: ${langs.automatic.slice(0, 12).join(", ")}${langs.automatic.length > 12 ? ", …" : ""}`
      : "",
  ].filter(Boolean);
  const dossier = dossierMarkdown({ ...ctx, segments: [], fetchedAt: now }, now, 3_000);
  const captionPart = captions.length
    ? `## Captions\n${captions.join("\n")}\nUse the extract-transcript tool to read what is said.`
    : "## Captions\nNone listed, so the transcript may be unavailable.";
  return `${dossier}\n\n${captionPart}${momentLinkLine(ctx)}\n`;
}

/** The `extract-transcript` tool's answer: the video's facts, then the transcript with `[m:ss]` timestamps. */
export function transcriptForAI(ctx: VideoContext, now = Date.now()): string {
  const dossier = dossierMarkdown(ctx, now, 1_500);
  const transcript =
    ctx.segments.length > 0
      ? `## Transcript\n${transcriptText(ctx.segments)}`
      : `## Transcript\nNot available${ctx.transcriptNote ? `: ${ctx.transcriptNote}` : ""}. Answer from the information above and say that the spoken content couldn't be read.`;
  return `${dossier}\n\n${transcript}${momentLinkLine(ctx)}\n`;
}

/** A saved conversation as Markdown. */
export function conversationMarkdown(ctx: VideoContext, turns: ChatTurn[], engineTitle?: string): string {
  const v = ctx.video;
  const header = [
    `# ${v.title}`,
    "",
    [v.uploader ?? v.channel, v.webpage_url ?? ctx.url].filter(Boolean).join(" · "),
    engineTitle ? `\n_Answers by ${engineTitle}_` : "",
  ].join("\n");
  const body = turns.map((t) => `## ${t.question}\n\n${t.answer}`).join("\n\n");
  return `${header}\n\n${body}\n`;
}
