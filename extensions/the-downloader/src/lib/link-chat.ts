import { Engine } from "./ai-engines.js";
import {
  LinkContext,
  LinkKind,
  bodyText,
  chunkBody,
  dossierMarkdown,
  estimateTokens,
  formatTimestamp,
  hasBody,
  isOverviewRequest,
  selectChunks,
  truncateToTokens,
} from "./link-context.js";
import { timestampUrl } from "./sources/video.js";

// How a question about a link becomes one or more model requests. The whole
// body (transcript, caption or article) goes along when it fits; otherwise
// specific questions get the most relevant excerpts, and overview questions
// ("summarize…") are answered from notes taken part by part (map-reduce), so
// small on-device models still see all of it.

export type ChatTurn = { question: string; answer: string };

const SHARED_RULES = [
  "If they don't cover something, say so plainly instead of guessing, and mark any outside knowledge as such.",
  "Use Markdown: short paragraphs, bullet lists where they help, bold for key terms. No preamble, and no source tags like [Description] or [Transcript].",
  "Reply in the language of the question.",
];

const INSTRUCTIONS: Record<LinkKind, string> = {
  video: [
    "You answer questions about one online video, using the video information and transcript provided.",
    "Base answers on the transcript and metadata.",
    SHARED_RULES[0],
    "Point to moments with timestamps in square brackets, like [4:05] or [1:02:30], taken from the transcript lines.",
    ...SHARED_RULES.slice(1),
  ].join(" "),
  post: [
    "You answer questions about one social media post, using its details and its caption or text provided.",
    "Base answers on them, and quote the caption where it helps.",
    ...SHARED_RULES,
  ].join(" "),
  page: [
    "You answer questions about one web page or article, using its details and text provided.",
    "Base answers on the text, and quote short phrases from it where it helps.",
    ...SHARED_RULES,
  ].join(" "),
};

/** The user's answer settings from Chat About Link's preferences. */
export type AnswerPrefs = {
  /** `balanced` (default), `short` or `detailed`. */
  style?: string;
  /** A language name such as `Spanish`; empty means the question's language. */
  language?: string;
  custom?: string;
};

/** Longest Custom Instructions kept: they share the small on-device models' context window. */
export const CUSTOM_INSTRUCTIONS_LIMIT = 500;

const STYLES: Record<string, string> = {
  short:
    "Keep answers short: start with a one-line **TL;DR**, then at most five short bullet points. No long paragraphs.",
  detailed: "Give thorough, well-structured answers: cover every relevant point and quote the source where it helps.",
};

/** The system instructions for chatting about one kind of link, with the user's answer settings. */
export function chatInstructions(kind: LinkKind, prefs: AnswerPrefs = {}): string {
  let text = INSTRUCTIONS[kind];
  const language = prefs.language?.trim();
  if (language) {
    text = text.replace(
      "Reply in the language of the question.",
      `Always reply in ${language}, whatever language the question or the source is in — every word, including headings and the TL;DR.`,
    );
  }
  const style = STYLES[prefs.style ?? ""];
  if (style) text = `${text} ${style}`;
  const custom = prefs.custom?.trim().slice(0, CUSTOM_INSTRUCTIONS_LIMIT);
  if (custom) {
    text = `${text} The user's own instructions for every answer — follow them; they come before the formatting and language rules above, but never state facts the source doesn't support: ${custom}`;
  }
  return text;
}

/** What the body is called in prompts and exports. */
const BODY_NAMES: Record<LinkKind, { full: string; excerpts: string; notes: string }> = {
  video: { full: "Transcript", excerpts: "Transcript excerpts", notes: "transcript" },
  post: { full: "Caption", excerpts: "Caption excerpts", notes: "text" },
  page: { full: "Article text", excerpts: "Article excerpts", notes: "article" },
};

const NO_BODY: Record<LinkKind, string> = {
  video:
    "No captions are available for this video. Answer from the information above, and say when a question needs the spoken content.",
  post: "This post has no caption or text. Answer from the information above.",
  page: "The page's text couldn't be read. Answer from the information above, and say when a question needs the article itself.",
};

const PART_INSTRUCTIONS: Record<LinkKind, string> = {
  video:
    "You take notes on one part of a video transcript. Write 4–8 concise bullet points covering what is said, each starting with the timestamp in square brackets where it happens, e.g. [12:34]. Keep names, numbers and claims exact. No introduction.",
  post: "You take notes on one part of a long post. Write 4–8 concise bullet points covering what it says. Keep names, numbers and claims exact. No introduction.",
  page: "You take notes on one part of an article. Write 4–8 concise bullet points covering what it says. Keep names, numbers and claims exact. No introduction.",
};

const MERGE_INSTRUCTIONS: Record<LinkKind, string> = {
  video:
    "You merge notes on consecutive parts of a video transcript into one shorter set of notes. Write 5–10 concise bullet points with the most important points, each starting with its timestamp in square brackets, e.g. [12:34]. Keep names, numbers and claims exact. No introduction.",
  post: "You merge notes on consecutive parts of a long post into one shorter set of notes. Write 5–10 concise bullet points with the most important points. Keep names, numbers and claims exact. No introduction.",
  page: "You merge notes on consecutive parts of an article into one shorter set of notes. Write 5–10 concise bullet points with the most important points. Keep names, numbers and claims exact. No introduction.",
};

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

function questionTail(question: string, history: ChatTurn[]): string {
  const past = historyText(history);
  return `${past ? `## Conversation so far\n${past}\n\n` : ""}## Question\n${question}`;
}

export type PromptPlan = {
  /** `full` sends the whole body; `excerpts` only the parts most relevant to the question. */
  mode: "full" | "excerpts";
  prompt: string;
};

/** The prompt for one question, fitted into `budgetTokens`. */
export function buildPrompt(ctx: LinkContext, question: string, history: ChatTurn[], budgetTokens: number): PromptPlan {
  const dossier = dossierMarkdown(ctx);
  const tail = questionTail(question, history);
  const names = BODY_NAMES[ctx.kind];
  const bodyBudget = budgetTokens - estimateTokens(dossier) - estimateTokens(tail) - 100;

  if (!hasBody(ctx)) {
    return { mode: "full", prompt: `${dossier}\n\n## ${names.full}\n${NO_BODY[ctx.kind]}\n\n${tail}` };
  }

  const full = bodyText(ctx.body);
  if (estimateTokens(full) <= bodyBudget) {
    return { mode: "full", prompt: `${dossier}\n\n## ${names.full}\n${full}\n\n${tail}` };
  }

  // The last question helps follow-ups like "tell me more about that".
  const query = [question, history.at(-1)?.question ?? ""].join(" ");
  // Chunks no bigger than half the budget, so at least one always fits.
  const budget = Math.max(bodyBudget, 120);
  const picked = selectChunks(chunkBody(ctx.body, Math.min(350, Math.floor(budget / 2))), query, budget);
  const excerpts = picked.map((c) => c.text).join(ctx.body.type === "segments" ? "\n…\n" : "\n\n…\n\n");
  return {
    mode: "excerpts",
    prompt: `${dossier}\n\n## ${names.excerpts}\nThe full ${names.notes} is longer; these are the parts most relevant to the question.\n${excerpts}\n\n${tail}`,
  };
}

export type AnswerOptions = {
  signal?: AbortSignal;
  onData?: (text: string) => void;
  /** Progress for multi-step answers, e.g. "Reading part 2 of 5…". */
  onStatus?: (status: string | undefined) => void;
  /** Local image files for engines that can look at them; they go with the final request only. */
  images?: string[];
  /** Answer Style, Answer Language and Custom Instructions; for answers, not for the notes taken on the way. */
  answer?: AnswerPrefs;
};

/** The prompt budget left once the images sent along have their room. */
function budgetFor(engine: Engine, options: AnswerOptions): number {
  return engine.contextBudget - engine.imageTokens * (options.images?.length ?? 0);
}

/** Thrown when the model finishes without writing anything; an empty answer isn't kept as one. */
export class EmptyAnswerError extends Error {
  constructor() {
    super("The model finished without an answer. Ask again, or choose another model in Chat About Link's preferences.");
    this.name = "EmptyAnswerError";
  }
}

function requireText(answer: string): string {
  if (!answer.trim()) throw new EmptyAnswerError();
  return answer;
}

/** Answer `question` about the link with `engine`, streaming the text through `onData`. */
export async function answerQuestion(
  engine: Engine,
  ctx: LinkContext,
  question: string,
  history: ChatTurn[],
  options: AnswerOptions = {},
): Promise<string> {
  const plan = buildPrompt(ctx, question, history, budgetFor(engine, options));
  if (plan.mode === "excerpts" && isOverviewRequest(question)) {
    return answerFromNotes(engine, ctx, question, options, history);
  }
  return requireText(
    await engine.complete(chatInstructions(ctx.kind, options.answer), plan.prompt, {
      signal: options.signal,
      onData: options.onData,
      onStatus: options.onStatus,
      images: options.images,
    }),
  );
}

/** Facts without the long description, for the part-by-part pass. */
function shortDossier(ctx: LinkContext): string {
  return dossierMarkdown(ctx, 300);
}

/**
 * Longest note kept for one part. 4–8 bullets fit easily; a small model that
 * repeats itself instead of stopping would otherwise write for minutes, until
 * the context window overflows and the whole summary fails.
 */
export const NOTE_CHAR_LIMIT = 2_500;

/** One part's notes, cut off at `NOTE_CHAR_LIMIT`. Stopping the answer (`signal`) still stops it. */
async function takeNote(engine: Engine, instructions: string, prompt: string, signal?: AbortSignal): Promise<string> {
  const part = new AbortController();
  const stop = () => part.abort();
  if (signal?.aborted) part.abort();
  signal?.addEventListener("abort", stop);
  let text = "";
  try {
    const note = await engine.complete(instructions, prompt, {
      signal: part.signal,
      onData: (sofar) => {
        text = sofar;
        if (sofar.length > NOTE_CHAR_LIMIT) part.abort();
      },
    });
    return note.slice(0, NOTE_CHAR_LIMIT);
  } catch (error) {
    // Cut off for running on, not stopped by the user: keep what it wrote.
    if (part.signal.aborted && !signal?.aborted) return text.slice(0, NOTE_CHAR_LIMIT);
    throw error;
  } finally {
    signal?.removeEventListener("abort", stop);
  }
}

function partRange(ctx: LinkContext, start: number, end: number): string {
  return ctx.body.type === "segments" ? ` (${formatTimestamp(start)}–${formatTimestamp(end)})` : "";
}

/** Notes on one part, or on a run of parts merged together. */
type Note = { first: number; last: number; start: number; end: number; text: string };

function noteHeading(ctx: LinkContext, note: Note): string {
  const parts = note.first === note.last ? `Part ${note.first}` : `Parts ${note.first}–${note.last}`;
  return `### ${parts}${partRange(ctx, note.start, note.end)}`;
}

const noteMarkdown = (ctx: LinkContext, note: Note) => `${noteHeading(ctx, note)}\n${note.text}`;

/** Below this, a note per part is cut to a line or two and the answer misses most of the body. */
export const MIN_NOTE_TOKENS = 200;
/** At most this many merge rounds: each costs a request per group. */
const MERGE_ROUNDS = 3;

/**
 * Merge neighbouring notes until each can keep `MIN_NOTE_TOKENS` in the final
 * request: a long video on a small model (Apple's on-device one) yields more
 * parts than its context window has room for, and cutting every note to a few
 * words left the summary nearly empty. Each group holds at least two notes and
 * no more than `readBudget` tokens, the size the model reads at once.
 */
export async function mergeNotes(
  engine: Engine,
  ctx: LinkContext,
  notes: Note[],
  noteBudget: number,
  readBudget: number,
  options: Pick<AnswerOptions, "signal" | "onStatus"> = {},
): Promise<Note[]> {
  let current = notes;
  for (let round = 0; round < MERGE_ROUNDS; round++) {
    if (current.length <= 1 || noteBudget / current.length >= MIN_NOTE_TOKENS) break;
    const groups: Note[][] = [];
    let group: Note[] = [];
    let size = 0;
    for (const note of current) {
      const tokens = estimateTokens(noteMarkdown(ctx, note));
      if (group.length >= 2 && size + tokens > readBudget) {
        groups.push(group);
        group = [];
        size = 0;
      }
      group.push(note);
      size += tokens;
    }
    // A lone last note joins the group before it, so every request merges something.
    if (group.length === 1 && groups.length > 0) groups[groups.length - 1].push(group[0]);
    else if (group.length) groups.push(group);

    const merged: Note[] = [];
    for (const [i, members] of groups.entries()) {
      options.onStatus?.(`Combining notes ${i + 1} of ${groups.length}…`);
      const perMember = Math.floor(readBudget / members.length);
      const text = members.map((n) => truncateToTokens(noteMarkdown(ctx, n), perMember)).join("\n\n");
      const note = await takeNote(engine, MERGE_INSTRUCTIONS[ctx.kind], text, options.signal);
      const first = members[0];
      const last = members[members.length - 1];
      merged.push({
        first: first.first,
        last: last.last,
        start: first.start,
        end: last.end,
        // A merge that wrote nothing keeps its notes, cut to size, rather than losing them.
        text: note.trim() || truncateToTokens(text, Math.floor(noteBudget / groups.length)),
      });
    }
    if (merged.length >= current.length) break;
    current = merged;
  }
  return current;
}

/**
 * Map-reduce for overview questions on small context windows: take notes on
 * each part of the body, then answer from the notes. When the body fits one
 * part (it only missed the budget because of the long description), it's
 * answered in one request instead.
 */
export async function answerFromNotes(
  engine: Engine,
  ctx: LinkContext,
  question: string,
  options: AnswerOptions = {},
  history: ChatTurn[] = [],
): Promise<string> {
  const facts = shortDossier(ctx);
  const names = BODY_NAMES[ctx.kind];
  const tail = questionTail(question, history);
  const finalBudget = budgetFor(engine, options);
  const partBudget = Math.max(800, finalBudget - estimateTokens(facts) - estimateTokens(tail) - 300);
  const parts = chunkBody(ctx.body, partBudget);

  if (parts.length === 1) {
    return requireText(
      await engine.complete(
        chatInstructions(ctx.kind, options.answer),
        `${facts}\n\n## ${names.full}\n${parts[0].text}\n\n${tail}`,
        {
          signal: options.signal,
          onData: options.onData,
          onStatus: options.onStatus,
          images: options.images,
        },
      ),
    );
  }

  const notes: Note[] = [];
  for (const [i, part] of parts.entries()) {
    options.onStatus?.(`Reading part ${i + 1} of ${parts.length}…`);
    const range = partRange(ctx, part.start, part.end);
    const note = await takeNote(
      engine,
      PART_INSTRUCTIONS[ctx.kind],
      `${facts}\n\n## ${names.full} part ${i + 1} of ${parts.length}${range}\n${part.text}`,
      options.signal,
    );
    notes.push({ first: i + 1, last: i + 1, start: part.start, end: part.end, text: note.trim() });
  }

  // Keep the notes inside the budget for the final request, merging them first when there are too many.
  const noteBudget = Math.max(600, finalBudget - estimateTokens(facts) - estimateTokens(tail) - 300);
  const kept = await mergeNotes(engine, ctx, notes, noteBudget, partBudget, options);
  const perNote = Math.floor(noteBudget / Math.max(kept.length, 1));
  const fitted = kept.map((n) => truncateToTokens(noteMarkdown(ctx, n), perNote)).join("\n\n");

  options.onStatus?.("Writing the answer…");
  const answer = await engine.complete(
    chatInstructions(ctx.kind, options.answer),
    `${facts}\n\n## Notes on the ${names.notes}, part by part\n${fitted}\n\n${tail}`,
    { signal: options.signal, onData: options.onData, images: options.images },
  );
  options.onStatus?.(undefined);
  return requireText(answer);
}

// ---------------------------------------------------------------------------
// Exports and AI tool output
// ---------------------------------------------------------------------------

/** The full context as Markdown, for "Copy Context for Any AI" — paste it into any AI chat. */
export function contextForExport(ctx: LinkContext): string {
  const body = hasBody(ctx) ? bodyText(ctx.body) : (ctx.note ?? NO_BODY[ctx.kind]);
  return `${dossierMarkdown(ctx, 5_000)}\n\n## ${BODY_NAMES[ctx.kind].full}\n${body}\n`;
}

/** The body as a text file, for "Save Text" (a video's transcript keeps its timestamps). */
export function bodyForSave(ctx: LinkContext): { name: string; content: string } {
  const label = ctx.kind === "video" ? "Transcript" : ctx.kind === "post" ? "Caption" : "Text";
  return { name: `${ctx.title} - ${label}`, content: `${ctx.title}\n${ctx.url}\n\n${bodyText(ctx.body)}\n` };
}

/**
 * Last line of every AI tool answer. The tool text is English, and models
 * sometimes answered a German question in English; the extension's AI
 * instructions say the same, but the reminder right after the text lands better.
 */
const REPLY_LANGUAGE_LINE = "\n\nReply in the language of the user's message, not the language of this text.";

/** How to link a moment, for models answering from the tool output (videos on YouTube and Vimeo). */
function momentLinkLine(ctx: LinkContext): string {
  const at = (s: number) => timestampUrl(ctx, s);
  return at(0)
    ? `\n\nWhen you point to a moment, and for every point of a summary, make its time the link text, like [4:05](${at(245)}) — never other words.`
    : "";
}

/** The `get-link-info` tool's answer: details and statistics, no body. */
export function linkInfoForAI(ctx: LinkContext): string {
  const dossier = dossierMarkdown(ctx, 3_000);
  const kind = `## Kind\nA ${ctx.kind === "page" ? "web page" : ctx.kind} on ${ctx.site}.`;
  let more: string;
  if (ctx.kind === "video") {
    const listed = ctx.facts.some((f) => /captions$/.test(f.label));
    more = listed
      ? "## Captions\nUse the read-link tool to read what is said."
      : "## Captions\nNone listed, so the transcript may be unavailable.";
  } else if (ctx.kind === "post") {
    more = `## Content\n${ctx.images?.length ? `${ctx.images.length} images. ` : ""}Use the read-link tool to read the caption.`;
  } else {
    more = "## Content\nUse the read-link tool to read the article.";
  }
  return `${dossier}\n\n${kind}\n\n${more}${momentLinkLine(ctx)}${REPLY_LANGUAGE_LINE}\n`;
}

/** Most text `read-link` hands Raycast AI: a 6-hour transcript or a huge page shouldn't fill its whole context. */
export const TOOL_BODY_TOKENS = 50_000;

/** The `read-link` tool's answer: the details, then the transcript with `[m:ss]` timestamps, the caption or the article. */
export function linkTextForAI(ctx: LinkContext): string {
  const dossier = dossierMarkdown(ctx, 1_500);
  const name = BODY_NAMES[ctx.kind].full;
  const full = bodyText(ctx.body);
  const text = truncateToTokens(full, TOOL_BODY_TOKENS);
  const cut = text === full ? "" : "\n\n(The text is longer; this is its start.)";
  const body = hasBody(ctx)
    ? `## ${name}\n${text}${cut}`
    : `## ${name}\nNot available${ctx.note ? `: ${ctx.note}` : ""}. Answer from the information above and say that the ${BODY_NAMES[ctx.kind].notes} couldn't be read.`;
  return `${dossier}\n\n${body}${momentLinkLine(ctx)}${REPLY_LANGUAGE_LINE}\n`;
}

/** A saved conversation as Markdown. */
export function conversationMarkdown(ctx: LinkContext, turns: ChatTurn[], engineTitle?: string): string {
  const header = [
    `# ${ctx.title}`,
    "",
    [ctx.author, ctx.url].filter(Boolean).join(" · "),
    engineTitle ? `\n_Answers by ${engineTitle}_` : "",
  ].join("\n");
  const body = turns.map((t) => `## ${t.question}\n\n${t.answer}`).join("\n\n");
  return `${header}\n\n${body}\n`;
}
