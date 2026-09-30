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
  "Use Markdown: short paragraphs, bullet lists where they help, bold for key terms. No preamble.",
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

/** The system instructions for chatting about one kind of link. */
export function chatInstructions(kind: LinkKind): string {
  return INSTRUCTIONS[kind];
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
  const picked = selectChunks(chunkBody(ctx.body, 350), query, Math.max(bodyBudget, 300));
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
};

/** The prompt budget left once the images sent along have their room. */
function budgetFor(engine: Engine, options: AnswerOptions): number {
  return engine.contextBudget - engine.imageTokens * (options.images?.length ?? 0);
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
  return engine.complete(chatInstructions(ctx.kind), plan.prompt, {
    signal: options.signal,
    onData: options.onData,
    onStatus: options.onStatus,
    images: options.images,
  });
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
async function takeNote(engine: Engine, kind: LinkKind, prompt: string, signal?: AbortSignal): Promise<string> {
  const part = new AbortController();
  const stop = () => part.abort();
  if (signal?.aborted) part.abort();
  signal?.addEventListener("abort", stop);
  let text = "";
  try {
    const note = await engine.complete(PART_INSTRUCTIONS[kind], prompt, {
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
    return engine.complete(chatInstructions(ctx.kind), `${facts}\n\n## ${names.full}\n${parts[0].text}\n\n${tail}`, {
      signal: options.signal,
      onData: options.onData,
      onStatus: options.onStatus,
      images: options.images,
    });
  }

  const notes: string[] = [];
  for (const [i, part] of parts.entries()) {
    options.onStatus?.(`Reading part ${i + 1} of ${parts.length}…`);
    const range = partRange(ctx, part.start, part.end);
    const note = await takeNote(
      engine,
      ctx.kind,
      `${facts}\n\n## ${names.full} part ${i + 1} of ${parts.length}${range}\n${part.text}`,
      options.signal,
    );
    notes.push(`### Part ${i + 1}${range}\n${note.trim()}`);
  }

  // Keep the notes inside the budget for the final request.
  const noteBudget = Math.max(600, finalBudget - estimateTokens(facts) - estimateTokens(tail) - 300);
  const perNote = Math.floor(noteBudget / Math.max(notes.length, 1));
  const fitted = notes.map((n) => truncateToTokens(n, perNote)).join("\n\n");

  options.onStatus?.("Writing the answer…");
  const answer = await engine.complete(
    chatInstructions(ctx.kind),
    `${facts}\n\n## Notes on the ${names.notes}, part by part\n${fitted}\n\n${tail}`,
    { signal: options.signal, onData: options.onData, images: options.images },
  );
  options.onStatus?.(undefined);
  return answer;
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

/** How to link a moment, for models answering from the tool output (videos on YouTube and Vimeo). */
function momentLinkLine(ctx: LinkContext): string {
  const at = (s: number) => timestampUrl(ctx, s);
  return at(0) ? `\n\nLink to a moment with its offset in seconds, e.g. [4:05](${at(245)}).` : "";
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
  return `${dossier}\n\n${kind}\n\n${more}${momentLinkLine(ctx)}\n`;
}

/** The `read-link` tool's answer: the details, then the transcript with `[m:ss]` timestamps, the caption or the article. */
export function linkTextForAI(ctx: LinkContext): string {
  const dossier = dossierMarkdown(ctx, 1_500);
  const name = BODY_NAMES[ctx.kind].full;
  const body = hasBody(ctx)
    ? `## ${name}\n${bodyText(ctx.body)}`
    : `## ${name}\nNot available${ctx.note ? `: ${ctx.note}` : ""}. Answer from the information above and say that the ${BODY_NAMES[ctx.kind].notes} couldn't be read.`;
  return `${dossier}\n\n${body}${momentLinkLine(ctx)}\n`;
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
