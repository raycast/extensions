import { AI, environment } from "@raycast/api";
import {
  type CodexThread,
  type CodexThreadConversationMessage,
  readThreadConversation,
} from "./codex-app-server";
import { cleanCodexUserMessage } from "./codex-message-cleaning";
import { getCodexSourceDescriptor } from "./codex-thread-display";
import {
  formatTimestampSeconds,
  getErrorMessage,
  getProjectName,
  getThreadDisplayTitle,
  tildeifyPath,
} from "./format";

const SUMMARY_MODEL = AI.Model["Anthropic_Claude_4.5_Haiku"];
export const SUMMARY_MODEL_LABEL = "Claude 4.5 Haiku";

const MAX_TRANSCRIPT_CHARS_PER_AI_CALL = 32_000;
const AI_RATE_LIMIT_RETRY_DELAYS_MS = [12_000, 30_000];
const MAX_TITLE_WORDS = 6;
const MAX_TITLE_LENGTH = 64;
const TITLE_FILLER_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);
const TITLE_WEAK_ACTION_WORDS = new Set([
  "add",
  "adding",
  "build",
  "building",
  "continue",
  "continuing",
  "create",
  "creating",
  "fix",
  "fixing",
  "implement",
  "implementing",
  "improve",
  "improving",
  "make",
  "making",
  "refactor",
  "refactoring",
  "review",
  "reviewing",
  "update",
  "updating",
]);

export type CodexThreadSummary = {
  title: string;
  markdown: string;
  model: string;
  messageCount: number;
  turnCount: number;
  transcriptCharacterCount: number;
  chunkCount: number;
};

export type CodexThreadTitleSuggestion = Omit<CodexThreadSummary, "markdown">;

type PreparedThreadTranscript = {
  messages: CodexThreadConversationMessage[];
  turnCount: number;
  chunks: string[];
  transcriptCharacterCount: number;
};

export async function summarizeCodexThread(
  thread: CodexThread,
): Promise<CodexThreadSummary> {
  ensureAiAccess();

  const preparedTranscript = await prepareThreadTranscript(thread);
  const chunkSummaries =
    preparedTranscript.chunks.length === 1
      ? []
      : await summarizeTranscriptChunks(thread, preparedTranscript.chunks);
  const source =
    preparedTranscript.chunks.length === 1
      ? preparedTranscript.chunks[0]
      : chunkSummaries.join("\n\n---\n\n");
  const rawSummary = await askSummaryAi(
    buildFinalSummaryPrompt(thread, source, preparedTranscript.chunks.length),
  );
  const parsedSummary = parseThreadSummaryResponse(rawSummary, thread);

  return {
    ...parsedSummary,
    model: SUMMARY_MODEL_LABEL,
    messageCount: preparedTranscript.messages.length,
    turnCount: preparedTranscript.turnCount,
    transcriptCharacterCount: preparedTranscript.transcriptCharacterCount,
    chunkCount: preparedTranscript.chunks.length,
  };
}

export async function generateCodexThreadTitle(
  thread: CodexThread,
): Promise<CodexThreadTitleSuggestion> {
  ensureAiAccess();

  const preparedTranscript = await prepareThreadTranscript(thread);
  const titleSignals =
    preparedTranscript.chunks.length === 1
      ? []
      : await summarizeTitleSignalChunks(thread, preparedTranscript.chunks);
  const source =
    preparedTranscript.chunks.length === 1
      ? preparedTranscript.chunks[0]
      : titleSignals.join("\n\n---\n\n");
  const rawTitle = await askSummaryAi(
    buildTitlePrompt(thread, source, preparedTranscript.chunks.length),
  );

  return {
    title: parseThreadTitleResponse(rawTitle, thread),
    model: SUMMARY_MODEL_LABEL,
    messageCount: preparedTranscript.messages.length,
    turnCount: preparedTranscript.turnCount,
    transcriptCharacterCount: preparedTranscript.transcriptCharacterCount,
    chunkCount: preparedTranscript.chunks.length,
  };
}

export function buildThreadSummaryDocument(
  thread: CodexThread,
  summary: CodexThreadSummary,
): string {
  const parts = [
    `# ${summary.title}`,
    "",
    summary.markdown.trim(),
    "",
    "---",
    "",
    `- Thread ID: \`${thread.id}\``,
    `- Project: \`${tildeifyPath(thread.cwd)}\``,
    `- Model: ${summary.model}`,
    `- Messages summarized: ${summary.messageCount}`,
    `- Transcript chunks: ${summary.chunkCount}`,
  ];

  return parts.join("\n");
}

function ensureAiAccess() {
  if (!environment.canAccess(AI)) {
    throw new Error(
      "Raycast AI is not available for this extension. Enable Raycast AI access and try again.",
    );
  }
}

async function processChunks(
  thread: CodexThread,
  chunks: string[],
  buildPrompt: (
    thread: CodexThread,
    chunk: string,
    index: number,
    total: number,
  ) => string,
): Promise<string[]> {
  const total = chunks.length;
  const results: string[] = [];

  for (const [index, chunk] of chunks.entries()) {
    const result = await askSummaryAi(
      buildPrompt(thread, chunk, index + 1, total),
    );
    results.push(result.trim());
  }

  return results;
}

function summarizeTranscriptChunks(
  thread: CodexThread,
  chunks: string[],
): Promise<string[]> {
  return processChunks(thread, chunks, buildChunkSummaryPrompt);
}

function summarizeTitleSignalChunks(
  thread: CodexThread,
  chunks: string[],
): Promise<string[]> {
  return processChunks(thread, chunks, buildTitleSignalChunkPrompt);
}

async function askSummaryAi(prompt: string): Promise<string> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await AI.ask(prompt, {
        creativity: "low",
        model: SUMMARY_MODEL,
      });
    } catch (error) {
      const delayMs = AI_RATE_LIMIT_RETRY_DELAYS_MS[attempt];
      if (!isRaycastAiRateLimitError(error)) {
        throw error;
      }

      if (delayMs === undefined) {
        throw new Error(
          `Raycast AI rate limit after retrying summary request: ${getErrorMessage(error)}`,
        );
      }

      await wait(delayMs);
    }
  }
}

function isRaycastAiRateLimitError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    message.includes("HTTP Status: 429") ||
    message.toLowerCase().includes("rate limited")
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildTitleSignalChunkPrompt(
  thread: CodexThread,
  chunk: string,
  chunkNumber: number,
  chunkCount: number,
) {
  return [
    "Extract only title-worthy signals from this Codex conversation chunk.",
    "Preserve the repo/product/domain, task type, main object, and concrete outcome.",
    "Ignore generic assistant phrasing, AGENTS instructions, and implementation noise that would not help future search.",
    "Return concise bullets only. Do not propose a final title yet.",
    "",
    "Thread metadata:",
    buildThreadMetadataBlock(thread),
    "",
    `Transcript chunk ${chunkNumber} of ${chunkCount}:`,
    "```text",
    chunk,
    "```",
  ].join("\n");
}

function buildChunkSummaryPrompt(
  thread: CodexThread,
  chunk: string,
  chunkNumber: number,
  chunkCount: number,
) {
  return [
    "You are summarizing one chunk of a longer Codex coding-agent conversation for later retrieval.",
    "Preserve concrete facts, file paths, repositories, decisions, blockers, commands, and follow-ups.",
    "Emphasize the actual work and outcome, not conversational filler.",
    "Return concise markdown with these exact headings:",
    "### Chunk Outcome",
    "### Concrete Work",
    "### Files, Repos, Commands",
    "### Decisions and Follow-ups",
    "### Title Signals",
    "",
    "Thread metadata:",
    buildThreadMetadataBlock(thread),
    "",
    `Transcript chunk ${chunkNumber} of ${chunkCount}:`,
    "```text",
    chunk,
    "```",
  ].join("\n");
}

function buildTitlePrompt(
  thread: CodexThread,
  source: string,
  chunkCount: number,
) {
  return [
    "Name this Codex conversation for a searchable Raycast thread browser.",
    "Return ONLY this plain-text format:",
    "TITLE: <semantic thread name>",
    "",
    "Rules:",
    "- 3 to 6 words. Never exceed 6 words.",
    "- Put the repo, product, or domain first when known.",
    "- Prefer compact noun phrases over sentences.",
    "- Omit filler verbs like improve, review, add, implement, update, help, or make.",
    "- Include the concrete object or outcome, not generic words like thread, chat, work, or conversation.",
    "- No dates unless the date is central to the work.",
    "- No Markdown formatting.",
    "",
    "Good examples:",
    "- Sapling chat bubbles sticky header",
    "- Janitor enhance text shortcut",
    "- Codex threads auto rename",
    "- Chichi PDF ingestion plan",
    "",
    "Thread metadata:",
    buildThreadMetadataBlock(thread),
    "",
    chunkCount === 1
      ? "Full transcript:"
      : "Title-signal summaries covering the full transcript:",
    "```text",
    source,
    "```",
  ].join("\n");
}

function buildFinalSummaryPrompt(
  thread: CodexThread,
  source: string,
  chunkCount: number,
) {
  return [
    "You distill a Codex coding-agent thread into a structured summary for a searchable Raycast thread browser. A future reader scans dozens of these summaries weeks later to recover the right thread.",
    "",
    "Use the transcript as the primary source of truth. Thread metadata supplies the repo, project, branch, and timing; rely on it for orientation, but never claim anything it does not support. Treat the existing title as a hint at intent, not a verdict.",
    "",
    "Optimize each summary for retrieval and triage: within five seconds, the reader should know what the thread did, what it touched, and whether to reopen it.",
    "",
    "Balance these priorities in order:",
    "1. Grounded specificity. Every claim ties to something in the transcript or metadata.",
    "2. Outcome clarity. What changed, was decided, or remains open is unmistakable.",
    "3. Search discoverability. Repos, files, products, commands, and concrete nouns appear verbatim.",
    "4. Brevity. Tight noun phrases over sentences; no filler.",
    "",
    "Return ONLY this plain-text format, with these exact headings in this order:",
    "",
    "TITLE: <semantic thread name>",
    "SUMMARY:",
    "### Outcome",
    "- <what the thread accomplished or decided>",
    "### Work Done",
    "- <specific implementation, audit, research, or artifact work>",
    "### Key Files and Artifacts",
    "- <paths, docs, commands, generated artifacts, or repos that matter>",
    "### Decisions",
    "- <important choices, constraints, or tradeoffs>",
    "### Follow-ups",
    "- <remaining work, blockers, or none noted>",
    "### Search Keywords",
    "- <compact comma-separated retrieval terms>",
    "",
    "Title rules:",
    "- 3 to 6 words. Never exceed 6 words.",
    "- Lead with the repo, product, or domain when known.",
    "- Compact noun phrases beat verb-led sentences. Use a verb only when the verb is the work itself.",
    "- Never begin with Codex, Thread, Conversation, Help with, or Summary.",
    "- No dates unless the date is central to the work.",
    "- No quotes, markdown, or trailing punctuation.",
    "",
    "Bullet rules:",
    "- 6 to 18 words per bullet. No multi-sentence bullets.",
    "- Reproduce file paths, commands, package names, function names, and identifiers verbatim. Do not paraphrase them.",
    "- Lead with the concrete object or change, not a generic verb.",
    "- One bullet per distinct fact. Do not restate the same fact under multiple headings.",
    "",
    "Search Keywords rules:",
    "- 6 to 12 lowercase, comma-separated terms on a single bullet.",
    "- Mix repo or product names, file or directory anchors, technical concepts, and the kind of work.",
    "- No duplicates, no quoting.",
    "",
    "If a heading has no grounded content in the transcript or metadata, write exactly:",
    "- None noted",
    "",
    "Hard constraints:",
    "- Do not invent file paths, commands, repos, decisions, or follow-ups not present in the transcript or metadata.",
    "- Do not summarize the agent's chain of thought, system events, AGENTS.md text, skill loads, or other scaffolding noise.",
    "- Do not include user names, dates, or session IDs unless they are central to the work.",
    "- Do not use em dashes anywhere in the output; use commas, colons, semicolons, parentheses, or hyphens.",
    "- Do not wrap the response in code fences. No preamble or postamble outside the prescribed format.",
    "",
    'For exploratory or abandoned threads with no concrete output, still produce every heading; use "- None noted" wherever grounded content is absent. Do not pad with generic statements like "discussed the topic" or "explored options".',
    "",
    "Title examples that work:",
    "- Sapling chat bubbles sticky header",
    "- Janitor enhance text shortcut",
    "- Codex threads auto rename",
    "- Chichi PDF ingestion plan",
    "- Codex thread search",
    "",
    "Thread metadata:",
    buildThreadMetadataBlock(thread),
    "",
    chunkCount === 1
      ? "Full transcript:"
      : "Per-chunk summaries covering the full transcript:",
    "```text",
    source,
    "```",
  ].join("\n");
}

async function prepareThreadTranscript(
  thread: CodexThread,
): Promise<PreparedThreadTranscript> {
  const conversation = await readThreadConversation(thread.id);
  const messages = cleanConversationMessages(conversation.messages);

  if (messages.length === 0) {
    throw new Error("No user or agent messages were found in this thread.");
  }

  const chunks = chunkConversationMessages(
    messages,
    MAX_TRANSCRIPT_CHARS_PER_AI_CALL,
  );

  return {
    messages,
    turnCount: conversation.turnCount,
    chunks,
    transcriptCharacterCount: chunks.reduce(
      (total, chunk) => total + chunk.length,
      0,
    ),
  };
}

function buildThreadMetadataBlock(thread: CodexThread) {
  return [
    `ID: ${thread.id}`,
    `Current title: ${getThreadDisplayTitle(thread)}`,
    `Preview: ${truncateForPrompt(thread.preview.replace(/\s+/g, " ").trim(), 700)}`,
    `Project: ${getProjectName(thread.cwd)}`,
    `Directory: ${tildeifyPath(thread.cwd)}`,
    `Branch: ${thread.gitInfo?.branch ?? "unknown"}`,
    `Source: ${getCodexSourceDescriptor(thread.source).label}`,
    `Created: ${formatTimestampSeconds(thread.createdAt)}`,
    `Updated: ${formatTimestampSeconds(thread.updatedAt)}`,
  ].join("\n");
}

function cleanConversationMessages(
  messages: CodexThreadConversationMessage[],
): CodexThreadConversationMessage[] {
  return messages
    .map((message) => ({
      ...message,
      text:
        message.role === "user"
          ? cleanCodexUserMessage(message.text, "compact")
          : message.text.trim(),
    }))
    .filter((message) => message.text.length > 0);
}

function chunkConversationMessages(
  messages: CodexThreadConversationMessage[],
  maxChunkCharacters: number,
): string[] {
  const chunks: string[] = [];
  let currentChunk = "";

  messages.forEach((message, index) => {
    const block = formatConversationMessage(message, index + 1);

    if (block.length > maxChunkCharacters) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      chunks.push(...splitLongBlock(block, maxChunkCharacters));
      return;
    }

    if (
      currentChunk.length > 0 &&
      currentChunk.length + block.length + 2 > maxChunkCharacters
    ) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }

    currentChunk = currentChunk ? `${currentChunk}\n\n${block}` : block;
  });

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

function formatConversationMessage(
  message: CodexThreadConversationMessage,
  index: number,
): string {
  const role = message.role === "user" ? "User" : "Agent";
  return `[${index}] ${role}:\n${message.text}`;
}

function splitLongBlock(block: string, maxChunkCharacters: number): string[] {
  const chunks: string[] = [];

  for (let start = 0; start < block.length; start += maxChunkCharacters) {
    chunks.push(block.slice(start, start + maxChunkCharacters).trim());
  }

  return chunks.filter(Boolean);
}

function parseThreadSummaryResponse(
  raw: string,
  thread: CodexThread,
): Pick<CodexThreadSummary, "title" | "markdown"> {
  const response = stripWrappingCodeFence(raw.trim());
  const titleMatch = response.match(/^TITLE:\s*(.+)$/im);
  const summaryMatch = response.match(/^SUMMARY:\s*([\s\S]*)$/im);
  const fallbackTitle = getThreadDisplayTitle(thread);
  const title = sanitizeGeneratedTitle(titleMatch?.[1] ?? fallbackTitle);
  const markdown = (
    summaryMatch?.[1] ?? response.replace(/^TITLE:\s*.+$/im, "")
  ).trim();

  return {
    title,
    markdown: markdown || "- None noted",
  };
}

function parseThreadTitleResponse(raw: string, thread: CodexThread): string {
  const response = stripWrappingCodeFence(raw.trim());
  const titleMatch = response.match(/^TITLE:\s*(.+)$/im);
  return sanitizeGeneratedTitle(
    titleMatch?.[1] ?? (response || getThreadDisplayTitle(thread)),
  );
}

function stripWrappingCodeFence(value: string): string {
  const match = value.match(/^```(?:\w+)?\s*\n([\s\S]*?)\n```$/);
  return match ? match[1].trim() : value;
}

function sanitizeGeneratedTitle(title: string): string {
  const normalizedTitle = title
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(?:TITLE|Thread|Codex Thread|Conversation|Summary)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.]+$/g, "");
  const shortTitle = capTitleWords(moveTrailingProjectToFront(normalizedTitle));

  if (shortTitle.length <= MAX_TITLE_LENGTH) {
    return shortTitle || "Untitled Codex Work";
  }

  const truncated = shortTitle
    .slice(0, MAX_TITLE_LENGTH)
    .replace(/\s+\S*$/, "")
    .trim();
  return capTitleWords(
    truncated || shortTitle.slice(0, MAX_TITLE_LENGTH).trim(),
  );
}

function moveTrailingProjectToFront(title: string): string {
  const match = title.match(/^(.+?)\s+(?:for|in)\s+([A-Z][A-Za-z0-9._-]+)$/);

  if (!match) {
    return title;
  }

  const topic = match[1].trim();
  const project = match[2].trim();

  if (!topic || topic.toLowerCase().startsWith(project.toLowerCase())) {
    return title;
  }

  return `${project} ${topic}`;
}

function capTitleWords(title: string): string {
  const words = title.split(/\s+/).filter(Boolean);

  if (words.length <= MAX_TITLE_WORDS) {
    return title;
  }

  const compactWords = words.filter((word, index) => {
    const normalizedWord = word
      .toLowerCase()
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");

    if (TITLE_FILLER_WORDS.has(normalizedWord)) {
      return false;
    }

    if (
      (index === 0 || index === 1) &&
      TITLE_WEAK_ACTION_WORDS.has(normalizedWord)
    ) {
      return false;
    }

    return true;
  });
  const candidateWords = compactWords.length >= 3 ? compactWords : words;

  return candidateWords.slice(0, MAX_TITLE_WORDS).join(" ");
}

function truncateForPrompt(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}
