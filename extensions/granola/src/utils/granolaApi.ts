import { showFailureToast } from "@raycast/utils";
import { toError } from "./errorUtils";
import getAccessToken from "./getAccessToken";
import getUserInfo from "./getUserInfo";
import { parseEventTime } from "./documentMatching";
import { convertDocumentToMarkdown } from "./convertJsonNodes";
import { PanelsByDocId, PanelsByPanelId, DocumentStructure, Document } from "./types";
import crypto from "crypto";

interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// Centralized API configuration
const API_CONFIG = {
  API_URL: "https://api.granola.ai/v1",
  STREAM_API_URL: "https://stream.api.granola.ai/v1",
  CLIENT_VERSION: "6.72.0",
  getUserAgent(): string {
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Granola/${this.CLIENT_VERSION} Chrome/136.0.7103.115 Electron/36.3.2 Safari/537.36`;
  },
  // Unique delimiter that's extremely unlikely to appear in content
  CHUNK_DELIMITER: "\x1F\x1E\x1D__GRANOLA_CHUNK__\x1D\x1E\x1F",
};

interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface TranscriptChunk {
  id: string;
  document_id: string;
  start_timestamp: string;
  end_timestamp: string;
  text: string;
  source: string;
  is_final: boolean;
}

// Chat with Documents interfaces
export interface DocumentSetResponse {
  documents: Record<string, DocumentMetadata>;
}

export interface DocumentMetadata {
  updated_at: string;
  owner: boolean;
}

export interface DocumentListsMetadataResponse {
  lists: Record<string, DocumentList>;
}

export interface DocumentList {
  id: string;
  title: string;
  description: string | null;
  icon: {
    type: string;
    color: string;
    value: string;
  } | null;
  visibility: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  workspace_id: string | null;
  preset: string | null;
  is_favourited: boolean;
  user_role: string;
  sharing_link_visibility: string;
  members: Array<{
    user_id: string;
    name: string;
    email: string;
    avatar: string;
    role: string;
    created_at: string;
  }>;
  invites: Array<Record<string, unknown>>;
  slack_channel: string | null;
  conference_mode: boolean;
  is_shared: boolean;
  document_ids?: string[];
}

export interface ChatMessage {
  role: "USER" | "ASSISTANT";
  text: string;
  file_attachments: Array<Record<string, unknown>>;
}

export interface ChatWithDocumentsRequest {
  chat_history: ChatMessage[];
  document_ids: string[];
  chat_context?: string;
  prompt_config?: {
    model: string;
  };
  num_meetings_in_context?: number;
  enable_reasoning?: boolean;
  exclude_transcripts?: boolean;
  meeting_chat_date_range?: {
    start_date?: string;
    end_date?: string;
  };
}

export interface TimeRangeConfig {
  label: string;
  value: string;
  exclude_transcripts: boolean;
  meeting_chat_date_range: {
    start_date?: string;
    end_date?: string;
  };
}

export interface CalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  attachments?: Array<{
    title?: string;
    fileUrl?: string;
  }>;
}

export interface CreateNoteProgress {
  step: "setup" | "processing" | "generating-title" | "streaming-summary" | "finalizing" | "complete";
  streamingContent?: string;
  title?: string;
}

export interface CreateNoteResult {
  documentId: string;
  title: string;
  noteUrl: string;
  panelId: string;
  summaryContent: string;
}

/**
 * Creates common HTTP headers for API requests
 */
async function createHeaders(extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getAccessToken();

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": API_CONFIG.getUserAgent(),
    "X-Client-Version": API_CONFIG.CLIENT_VERSION,
    ...extraHeaders,
  };
}

/**
 * Centralized error handling for API responses
 */
function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const seconds = Number(trimmed);
  if (!Number.isNaN(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return null;
}

async function handleApiError(response: Response, operationName: string): Promise<never> {
  let errorMessage = `${operationName} failed: ${response.statusText}`;

  try {
    const errorBody = await response.text();
    if (errorBody) {
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.error) {
          errorMessage = `${operationName} failed: ${errorJson.error}`;
        } else if (errorJson.message) {
          errorMessage = `${operationName} failed: ${errorJson.message}`;
        } else {
          errorMessage = `${operationName} failed: ${errorBody}`;
        }
      } catch {
        // If JSON parsing fails, use the raw body
        errorMessage = `${operationName} failed: ${errorBody}`;
      }
    }
  } catch {
    // If reading the body fails, fall back to status text
  }

  const error = new Error(errorMessage) as Error & { status?: number; statusText?: string; retryAfterMs?: number };
  error.status = response.status;
  error.statusText = response.statusText;

  if (response.status === 429) {
    const retryAfterMs = parseRetryAfterMs(response.headers.get("Retry-After"));
    if (retryAfterMs !== null) {
      error.retryAfterMs = retryAfterMs;
    }
  }

  throw error;
}

/**
 * Validates if a string is a complete JSON object
 */
function isCompleteJson(str: string): boolean {
  try {
    const trimmed = str.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
      return false;
    }
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely parses streaming chunks with improved delimiter and validation
 */
function parseStreamingChunks(chunk: string): string[] {
  const delimiter = chunk.includes("-----CHUNK_BOUNDARY-----")
    ? "-----CHUNK_BOUNDARY-----"
    : API_CONFIG.CHUNK_DELIMITER;
  const chunks = chunk.split(delimiter);
  const validChunks: string[] = [];

  for (const chunkPart of chunks) {
    const trimmed = chunkPart.trim();
    if (trimmed && isCompleteJson(trimmed)) {
      validChunks.push(trimmed);
    }
  }

  return validChunks;
}

/**
 * Common HTML/Markdown cleanup logic
 */
function cleanupContent(content: string, outputFormat: "display" | "html" = "display"): string {
  let cleaned = content.trim();

  // Remove <notes> wrapper tags if present
  if (cleaned.startsWith("<notes>")) {
    cleaned = cleaned.substring(7);
  }
  if (cleaned.endsWith("</notes>")) {
    cleaned = cleaned.substring(0, cleaned.length - 8);
  }

  // Remove any stray closing notes tags
  cleaned = cleaned.replace(/<\/notes>/g, "");

  if (outputFormat === "display") {
    // Keep as markdown for display
    cleaned = cleaned
      .replace(/### (.*?)(?=\n|$)/g, "### $1")
      .replace(/^- (.*?)(?=\n|$)/gm, "- $1")
      .replace(/^\s+- (.*?)(?=\n|$)/gm, "  - $1");

    // More carefully remove only unwanted HTML tags, preserving valid content
    cleaned = cleaned.replace(/<\/?(?:div|span|p|br)\s*[^>]*>/gi, "");
  } else {
    // Convert markdown to HTML
    cleaned = cleaned
      .replace(/### /g, "<h3>")
      .replace(/\n- /g, "\n<li>")
      .replace(/\n {2}- /g, "\n<li>");

    // Add proper HTML structure
    const lines = cleaned.split("\n");
    const processedLines: string[] = [];
    let inList = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith("<h3>")) {
        if (inList) {
          processedLines.push("</ul>");
          inList = false;
        }
        processedLines.push(trimmedLine + "</h3>");
      } else if (trimmedLine.startsWith("<li>")) {
        if (!inList) {
          processedLines.push("<ul>");
          inList = true;
        }
        processedLines.push(trimmedLine + "</li>");
      } else if (trimmedLine && !trimmedLine.startsWith("<")) {
        if (inList) {
          processedLines.push("</ul>");
          inList = false;
        }
        processedLines.push(`<p>${trimmedLine}</p>`);
      } else if (trimmedLine) {
        processedLines.push(trimmedLine);
      }
    }

    if (inList) {
      processedLines.push("</ul>");
    }

    cleaned = processedLines.join("\n");
  }

  // Remove excessive whitespace and normalize line breaks
  cleaned = cleaned
    .replace(/\n\s*\n\s*\n/g, "\n\n") // Max 2 consecutive line breaks
    .replace(/^\s+/gm, "") // Remove leading whitespace from lines
    .trim();

  return cleaned;
}

/**
 * Creates a new document
 */
async function createDocument(documentId: string, userInfo: UserInfo): Promise<void> {
  const headers = await createHeaders();

  const response = await fetch(`${API_CONFIG.API_URL}/create-document`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: documentId,
      user_id: userInfo.id,
      transcribe: false,
      creation_source: "macOS",
    }),
  });

  if (!response.ok) {
    await handleApiError(response, "Create document");
  }
}

/**
 * Updates document for transcription
 */
async function updateDocumentForTranscription(documentId: string): Promise<void> {
  const headers = await createHeaders();

  const response = await fetch(`${API_CONFIG.API_URL}/update-document`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      transcribe: true,
      id: documentId,
      updated_at: getISOTimestamp(),
      attachments: [],
      show_private_notes: true,
      notes: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: {
              id: generateUUID(),
              timestamp: null,
              "timestamp-to": null,
            },
          },
        ],
      },
      notes_plain: "",
      notes_markdown: "",
    }),
  });

  if (!response.ok) {
    await handleApiError(response, "Update document for transcription");
  }
}

/**
 * Inserts transcript chunks
 */
async function insertTranscriptChunks(transcript: string, documentId: string): Promise<void> {
  const headers = await createHeaders();
  const transcriptChunks = createTranscriptChunks(transcript, documentId);

  const response = await fetch(`${API_CONFIG.API_URL}/insert-transcriptions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ chunks: transcriptChunks }),
  });

  if (!response.ok) {
    await handleApiError(response, "Insert transcript chunks");
  }
}

/**
 * Generates title for the document
 */
async function generateTitle(transcript: string, documentId: string, userInfo: UserInfo): Promise<string> {
  const headers = await createHeaders();

  const response = await fetch(`${API_CONFIG.API_URL}/llm-proxy`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt_slug: "meeting-title",
      prompt_variables: {
        transcript,
        notes: "",
        urls: "",
        viewer_name: userInfo.name,
        viewer_bio: "",
        viewer_company: "",
        my_name: userInfo.name,
        their_name: "",
        my_bio: "",
        their_bio: "",
        participants: `${userInfo.name} <${userInfo.email}>`,
        headers: "",
        document_id: documentId,
        calendar_event_title: "",
        my_company: "",
        my_colleagues: "",
        external_attendees: "",
        external_companies: "",
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(),
        todays_date: getISOTimestamp(),
        is_multi_language: false,
        english_only_summary: true,
        user_dictionary: "",
      },
    }),
  });

  if (!response.ok) {
    await handleApiError(response, "Generate title");
  }

  const titleData = (await response.json()) as LLMResponse;
  return titleData.choices[0].message.content;
}

/**
 * Finalizes document with title
 */
async function finalizeDocumentWithTitle(documentId: string, title: string): Promise<void> {
  const headers = await createHeaders();

  const response = await fetch(`${API_CONFIG.API_URL}/update-document`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      transcribe: false,
      id: documentId,
      updated_at: getISOTimestamp(),
      meeting_end_count: 1,
      title,
      show_private_notes: false,
    }),
  });

  if (!response.ok) {
    await handleApiError(response, "Finalize document with title");
  }
}

/**
 * Generates AI summary with streaming
 */
async function generateAISummaryWithStreaming(
  transcript: string,
  title: string,
  onContentUpdate?: (content: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const headers = await createHeaders();

  const response = await fetch(`${API_CONFIG.STREAM_API_URL}/llm-proxy-stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt_slug: "notes-centric-short-input",
      prompt_variables: {
        transcript,
        calendar_event_title: title,
      },
    }),
    signal,
  });

  if (!response.ok) {
    await handleApiError(response, "Generate AI summary");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Failed to read response stream");
  }

  let summaryContent = "";
  let done = false;

  try {
    while (!done) {
      // Check if cancelled before reading
      if (signal?.aborted) {
        reader.cancel();
        throw new Error("Operation cancelled");
      }

      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      // Check again after read
      if (signal?.aborted) {
        reader.cancel();
        throw new Error("Operation cancelled");
      }

      if (value) {
        const chunk = new TextDecoder().decode(value);
        const validChunks = parseStreamingChunks(chunk);

        for (const chunkPart of validChunks) {
          try {
            const data = JSON.parse(chunkPart);
            const deltaContent = data.choices?.[0]?.delta?.content || "";
            if (deltaContent) {
              summaryContent += deltaContent;
              // Stream the content to the UI
              const cleanedContent = cleanupContent(summaryContent, "display");
              onContentUpdate?.(cleanedContent);
            }
          } catch (e) {
            // Skip invalid JSON chunks
          }
        }
      }
    }
  } finally {
    // Ensure reader is cancelled if operation was aborted
    if (signal?.aborted) {
      reader.cancel();
    }
  }

  // Clean up the content for final HTML rendering
  return cleanupContent(summaryContent, "html");
}

/**
 * Creates summary panel
 */
async function createSummaryPanel(documentId: string, panelId: string): Promise<void> {
  const headers = await createHeaders();
  const createdAt = getISOTimestamp();

  const response = await fetch(`${API_CONFIG.API_URL}/create-document-panel`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: panelId,
      document_id: documentId,
      title: "Summary",
      template_slug: "v2:notes-centric-short-input",
      created_at: createdAt,
    }),
  });

  if (!response.ok) {
    await handleApiError(response, "Create summary panel");
  }
}

/**
 * Updates summary panel with content
 */
async function updateSummaryPanel(documentId: string, panelId: string, summaryContent: string): Promise<void> {
  const headers = await createHeaders();
  const createdAt = getISOTimestamp();
  const linkHtml = `\n<hr>\n<p>Chat with meeting transcript: <a href="https://notes.granola.ai/d/${documentId}">https://notes.granola.ai/d/${documentId}</a></p>\n`;
  const fullContent = summaryContent + linkHtml;

  const response = await fetch(`${API_CONFIG.API_URL}/update-document-panel`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: panelId,
      document_id: documentId,
      title: "Summary",
      content: fullContent,
      template_slug: "v2:notes-centric-short-input",
      created_at: createdAt,
      updated_at: getISOTimestamp(),
      content_updated_at: getISOTimestamp(),
      original_content: fullContent,
      deleted_at: null,
      last_viewed_at: createdAt,
      affinity_note_id: null,
      suggested_questions: null,
      generated_lines: [],
      user_feedback: null,
    }),
  });

  if (!response.ok) {
    await handleApiError(response, "Update summary panel");
  }
}

/**
 * Updates last viewed timestamp
 */
async function updateLastViewedTimestamp(panelId: string): Promise<void> {
  const headers = await createHeaders();
  const lastViewedAt = getISOTimestamp();

  const response = await fetch(`${API_CONFIG.API_URL}/update-document-panel`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      last_viewed_at: lastViewedAt,
      id: panelId,
      updated_at: lastViewedAt,
    }),
  });

  if (!response.ok) {
    await handleApiError(response, "Update last viewed timestamp");
  }
}

/**
 * Main function to create note from transcript - now properly broken down
 */
export async function createNoteFromTranscript(
  transcript: string,
  onProgress?: (progress: CreateNoteProgress) => void,
  signal?: AbortSignal,
): Promise<CreateNoteResult> {
  const userInfo = await getUserInfo();

  try {
    // Step 1: Create a new document
    if (signal?.aborted) throw new Error("Operation cancelled");
    onProgress?.({ step: "setup" });
    const documentId = crypto.randomUUID();
    await createDocument(documentId, userInfo);

    // Step 1b: Update document for transcription
    if (signal?.aborted) throw new Error("Operation cancelled");
    await updateDocumentForTranscription(documentId);

    // Step 2: Insert transcript chunks
    if (signal?.aborted) throw new Error("Operation cancelled");
    onProgress?.({ step: "processing" });
    await insertTranscriptChunks(transcript, documentId);

    // Step 3: Generate title
    if (signal?.aborted) throw new Error("Operation cancelled");
    onProgress?.({ step: "generating-title" });
    const title = await generateTitle(transcript, documentId, userInfo);

    // Step 4: Finalize document with title
    if (signal?.aborted) throw new Error("Operation cancelled");
    await finalizeDocumentWithTitle(documentId, title);

    // Step 5: Generate AI summary with streaming
    if (signal?.aborted) throw new Error("Operation cancelled");
    onProgress?.({ step: "streaming-summary", title, streamingContent: "" });
    const summaryContent = await generateAISummaryWithStreaming(
      transcript,
      title,
      (content) => {
        if (!signal?.aborted) {
          onProgress?.({ step: "streaming-summary", title, streamingContent: content });
        }
      },
      signal,
    );

    // Step 6: Create and update summary panel
    if (signal?.aborted) throw new Error("Operation cancelled");
    onProgress?.({ step: "finalizing", title });
    const panelId = generateUUID();
    await createSummaryPanel(documentId, panelId);
    await updateSummaryPanel(documentId, panelId, summaryContent);

    // Step 7: Update last_viewed_at timestamp
    if (signal?.aborted) throw new Error("Operation cancelled");
    await updateLastViewedTimestamp(panelId);

    onProgress?.({ step: "complete", title });

    const linkHtml = `\n<hr>\n<p>Chat with meeting transcript: <a href="https://notes.granola.ai/d/${documentId}">https://notes.granola.ai/d/${documentId}</a></p>\n`;

    return {
      documentId,
      title,
      noteUrl: `https://notes.granola.ai/d/${documentId}`,
      panelId,
      summaryContent: summaryContent + linkHtml,
    };
  } catch (error) {
    // Don't show error toast if operation was cancelled
    if (!signal?.aborted) {
      showFailureToast(toError(error), { title: "Failed to create note" });
    }
    throw toError(error);
  }
}

function createTranscriptChunks(transcript: string, documentId: string): TranscriptChunk[] {
  const lines = transcript.trim().split("\n");
  const chunks: TranscriptChunk[] = [];
  const currentTime = Date.now() / 1000;

  lines.forEach((line, index) => {
    if (line.trim()) {
      chunks.push({
        id: generateUUID(),
        document_id: documentId,
        start_timestamp: getISOTimestampOffset(currentTime + index * 2),
        end_timestamp: getISOTimestampOffset(currentTime + index * 2 + 1.5),
        text: line.trim(),
        source: "microphone",
        is_final: true,
      });
    }
  });

  return chunks;
}

function generateUUID(): string {
  return crypto.randomUUID();
}

function getISOTimestamp(): string {
  return new Date().toISOString().replace("Z", "") + "Z";
}

function getISOTimestampOffset(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().replace("Z", "") + "Z";
}

/**
 * Saves a document to Notion
 * @param documentId - The ID of the document to save
 * @returns A promise that resolves when the document is saved
 */
export interface NotionSaveResult {
  status: string;
  page_url: string;
}

export interface NotionSaveRetryOptions {
  signal?: AbortSignal;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, delayMs: number) => void;
}

export interface DocumentMetadataRequest {
  document_id: string;
}

export interface DocumentMetadataResponse {
  title: string;
  created_at: string;
  creator: {
    name: string;
    email: string;
    details: {
      person: {
        name: {
          fullName: string;
          givenName?: string;
          familyName?: string;
        };
        avatar?: string;
        employment?: {
          title: string;
          name: string;
        };
        linkedin?: {
          handle: string;
        };
      };
      company: {
        name?: string;
      };
    };
  };
  attendees: Array<{
    email: string;
    details: {
      person: {
        name: {
          fullName: string;
          givenName?: string;
          familyName?: string;
        };
        avatar?: string;
        employment?: {
          title: string;
          name: string;
        };
        linkedin?: {
          handle: string;
        };
      };
      company: {
        name?: string;
      };
    };
  }>;
  sharing_link_visibility: string;
}

export async function saveToNotion(documentId: string, signal?: AbortSignal): Promise<NotionSaveResult> {
  const headers = await createHeaders();

  const response = await fetch(`${API_CONFIG.API_URL}/save-to-notion`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      document_id: documentId,
    }),
    signal,
  });

  if (!response.ok) {
    await handleApiError(response, "Save to Notion");
  }

  const result = (await response.json()) as NotionSaveResult;

  if (result.status !== "success") {
    throw new Error(`Notion save failed with status: ${result.status}`);
  }

  return result;
}

const isRateLimitError = (
  error: unknown,
): error is Error & { status?: number; message?: string; retryAfterMs?: number } => {
  if (!error || typeof error !== "object") return false;
  const err = error as { status?: number; message?: string };
  if (err.status === 429) return true;
  const message = typeof err.message === "string" ? err.message.toLowerCase() : "";
  return (
    message.includes("rate limit") ||
    message.includes("rate_limit") ||
    message.includes("ratelimit") ||
    message.includes("too many requests")
  );
};

const delay = (ms: number, signal?: AbortSignal): Promise<void> => {
  if (!signal) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      const abortError = new Error("The operation was aborted.");
      (abortError as Error & { name?: string }).name = "AbortError";
      reject(abortError);
    };
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    };

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener("abort", onAbort);
  });
};

export async function saveToNotionWithRetry(
  documentId: string,
  options: NotionSaveRetryOptions = {},
): Promise<NotionSaveResult> {
  const { signal, maxRetries = 2, baseDelayMs = 1000, maxDelayMs = 10000, onRetry } = options;
  let attempt = 0;

  // Retry only on rate limits; other errors surface immediately.
  for (;;) {
    try {
      return await saveToNotion(documentId, signal);
    } catch (error) {
      if (!isRateLimitError(error)) {
        throw error;
      }
      if (attempt >= maxRetries) {
        throw error;
      }

      const retryAfterMs =
        typeof error.retryAfterMs === "number" && !Number.isNaN(error.retryAfterMs) ? error.retryAfterMs : null;
      const delayMs =
        retryAfterMs && retryAfterMs > 0 ? retryAfterMs : Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));

      attempt += 1;
      if (onRetry) {
        onRetry(attempt, delayMs);
      }

      await delay(delayMs, signal);
    }
  }
}

/**
 * Get document metadata including calendar event and organizer info
 * @param documentId - The ID of the document to get metadata for
 * @returns A promise that resolves with the document metadata
 */
export async function getDocumentMetadata(documentId: string): Promise<DocumentMetadataResponse> {
  const headers = await createHeaders({
    Accept: "*/*",
    "Accept-Language": "en-US",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  });

  const response = await fetch(`${API_CONFIG.API_URL}/get-document-metadata`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      document_id: documentId,
    }),
  });

  if (!response.ok) {
    await handleApiError(response, "Get document metadata");
  }

  const result = (await response.json()) as DocumentMetadataResponse;
  return result;
}

/**
 * Get notes_markdown for a specific document (loaded on-demand)
 * Uses get-documents-batch endpoint for efficient single-document fetch
 * @param documentId - The ID of the document to get notes_markdown for
 * @returns A promise that resolves with the notes_markdown string
 */
export async function getDocumentNotesMarkdown(documentId: string): Promise<string> {
  const headers = await createHeaders();

  const sanitizeNotesString = (value?: string): string => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.toLowerCase() === "undefined") return "";
    return value;
  };

  const extractNotesMarkdown = (doc?: Document): string => {
    if (!doc) return "";

    const notesMarkdown = sanitizeNotesString(doc.notes_markdown);
    if (notesMarkdown) {
      return notesMarkdown;
    }

    // Some documents may only have the structured notes tree populated
    if (doc.notes && Array.isArray(doc.notes.content) && doc.notes.content.length > 0) {
      const markdown = sanitizeNotesString(convertDocumentToMarkdown(doc.notes as unknown as DocumentStructure));
      if (markdown) {
        return markdown;
      }
    }

    const notesPlain = sanitizeNotesString(doc.notes_plain);
    if (notesPlain) {
      return notesPlain;
    }

    return "";
  };

  // Try get-documents-batch first (more efficient for single document)
  try {
    const batchResponse = await fetch(`${API_CONFIG.API_URL}/get-documents-batch`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        document_ids: [documentId],
      }),
    });

    if (batchResponse.ok) {
      const batchResult = (await batchResponse.json()) as { docs?: Document[] };
      const doc = batchResult.docs?.[0];
      const markdown = extractNotesMarkdown(doc);
      if (markdown) return markdown;
    }
  } catch {
    // Fall through to alternative method
  }

  // Fallback: Return empty string instead of fetching all documents
  // Fetching all documents is too expensive and can cause memory issues
  return "";
}

/**
 * Batch fetch notes_markdown for multiple documents at once
 * Much more efficient than calling getDocumentNotesMarkdown for each document
 * @param documentIds - Array of document IDs to fetch notes for
 * @param batchSize - Number of documents per API request (default: 20)
 * @returns A promise that resolves with a map of documentId -> notes_markdown
 */
export async function getDocumentNotesMarkdownBatch(
  documentIds: string[],
  batchSize: number = 20,
): Promise<Record<string, string>> {
  const headers = await createHeaders();
  const results: Record<string, string> = {};

  const sanitizeNotesString = (value?: string): string => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.toLowerCase() === "undefined") return "";
    return value;
  };

  const extractNotesMarkdown = (doc?: Document): string => {
    if (!doc) return "";

    const notesMarkdown = sanitizeNotesString(doc.notes_markdown);
    if (notesMarkdown) {
      return notesMarkdown;
    }

    if (doc.notes && Array.isArray(doc.notes.content) && doc.notes.content.length > 0) {
      const markdown = sanitizeNotesString(convertDocumentToMarkdown(doc.notes as unknown as DocumentStructure));
      if (markdown) {
        return markdown;
      }
    }

    const notesPlain = sanitizeNotesString(doc.notes_plain);
    if (notesPlain) {
      return notesPlain;
    }

    return "";
  };

  // Process in batches
  for (let i = 0; i < documentIds.length; i += batchSize) {
    const batch = documentIds.slice(i, i + batchSize);

    try {
      const batchResponse = await fetch(`${API_CONFIG.API_URL}/get-documents-batch`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          document_ids: batch,
        }),
      });

      if (batchResponse.ok) {
        const batchResult = (await batchResponse.json()) as { docs?: Document[] };
        if (batchResult.docs) {
          for (const doc of batchResult.docs) {
            if (doc.id) {
              results[doc.id] = extractNotesMarkdown(doc);
            }
          }
        }
      }
    } catch {
      // On error, set empty strings for this batch
      for (const docId of batch) {
        if (!(docId in results)) {
          results[docId] = "";
        }
      }
    }

    // Minimal delay between batches
    if (i + batchSize < documentIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  // Ensure all requested IDs have a result
  for (const docId of documentIds) {
    if (!(docId in results)) {
      results[docId] = "";
    }
  }

  return results;
}

/**
 * Get all documents accessible to the user
 */
export async function getDocumentSet(): Promise<DocumentSetResponse> {
  const headers = await createHeaders();

  const response = await fetch(`${API_CONFIG.API_URL}/get-document-set`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    await handleApiError(response, "Get document set");
  }

  return (await response.json()) as DocumentSetResponse;
}

/**
 * Get document panels for a specific document
 * @param documentId - The ID of the document to get panels for
 * @returns A promise that resolves with the panels data
 */
export async function getDocumentPanels(documentId: string, signal?: AbortSignal): Promise<PanelsByDocId | null> {
  const headers = await createHeaders();

  const response = await fetch(`${API_CONFIG.API_URL}/get-document-panels`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      document_id: documentId,
    }),
    signal,
  });

  if (!response.ok) {
    await handleApiError(response, "Get document panels");
  }

  const result = (await response.json()) as unknown;

  // Handle different response formats
  // API might return: { panels: {...} } or { document_panels: {...} } or directly the panels object
  if (result && typeof result === "object") {
    const resultObj = result as Record<string, unknown>;

    // Check for nested panels structure
    if (resultObj.panels && typeof resultObj.panels === "object") {
      return { [documentId]: resultObj.panels as PanelsByPanelId } as PanelsByDocId;
    }
    if (resultObj.document_panels && typeof resultObj.document_panels === "object") {
      return { [documentId]: resultObj.document_panels as PanelsByPanelId } as PanelsByDocId;
    }

    // If result is directly panels structure, wrap it
    if (Array.isArray(resultObj) || Object.keys(resultObj).length > 0) {
      // Convert array of panels to PanelsByDocId format
      if (Array.isArray(resultObj)) {
        const panelsByPanelId: PanelsByPanelId = {};
        for (const panel of resultObj) {
          if (panel && typeof panel === "object" && "id" in panel) {
            const panelId = (panel as { id: string }).id;
            panelsByPanelId[panelId] = {
              original_content: (panel as { original_content?: string }).original_content || "",
              content: (panel as { content?: unknown }).content as DocumentStructure | undefined,
            };
          }
        }
        return { [documentId]: panelsByPanelId } as PanelsByDocId;
      }

      // Assume it's already in PanelsByPanelId format
      return { [documentId]: resultObj as PanelsByPanelId } as PanelsByDocId;
    }
  }

  return null;
}

/**
 * Batch fetch document panels for multiple documents in parallel
 * Processes requests in batches to avoid overwhelming the API
 * @param documentIds - Array of document IDs to fetch panels for
 * @param batchSize - Number of parallel requests per batch (default: 10)
 * @param onProgress - Optional callback for progress updates
 * @returns A promise that resolves with all panels data
 */
export async function getDocumentPanelsBatch(
  documentIds: string[],
  batchSize: number = 15,
  onProgress?: (processed: number, total: number) => void,
): Promise<PanelsByDocId> {
  const allPanels: PanelsByDocId = {};
  let processedCount = 0;

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < documentIds.length; i += batchSize) {
    const batch = documentIds.slice(i, i + batchSize);

    // Fetch all panels in the batch in parallel
    const batchPromises = batch.map(async (documentId) => {
      try {
        const panels = await getDocumentPanels(documentId);
        return { documentId, panels };
      } catch (error) {
        // If a panel fetch fails, log but continue with other documents
        console.warn(`Failed to fetch panels for document ${documentId}:`, error);
        return { documentId, panels: null };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    // Merge results into allPanels
    for (const { documentId, panels } of batchResults) {
      if (panels && panels[documentId]) {
        allPanels[documentId] = panels[documentId];
      }
    }

    processedCount += batch.length;
    if (onProgress) {
      onProgress(processedCount, documentIds.length);
    }

    // Minimal delay between batches
    if (i + batchSize < documentIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  return allPanels;
}

/**
 * Get document lists metadata with optional document IDs
 */
export async function getDocumentListsMetadata(includeDocumentIds = true): Promise<DocumentListsMetadataResponse> {
  const headers = await createHeaders();

  const response = await fetch(`${API_CONFIG.API_URL}/get-document-lists-metadata`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      include_document_ids: includeDocumentIds,
      include_only_joined_lists: false,
    }),
  });

  if (!response.ok) {
    await handleApiError(response, "Get document lists metadata");
  }

  return (await response.json()) as DocumentListsMetadataResponse;
}

/**
 * Chat with documents using streaming API
 */
export async function chatWithDocuments(
  request: ChatWithDocumentsRequest,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  const headers = await createHeaders({
    Accept: "*/*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US",
  });

  const requestBody = {
    chat_context: "global",
    prompt_config: {
      model: "auto",
    },
    num_meetings_in_context: 25,
    enable_reasoning: true,
    exclude_transcripts: true,
    meeting_chat_date_range: {},
    ...request,
  };

  const response = await fetch(`${API_CONFIG.STREAM_API_URL}/chat-with-documents`, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    await handleApiError(response, "Chat with documents");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Failed to read response stream");
  }

  let fullResponse = "";
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;

    if (value) {
      const chunk = new TextDecoder().decode(value);
      fullResponse += chunk;
      onChunk?.(chunk);
    }
  }

  return fullResponse;
}

/**
 * Get time range configurations for different time periods
 */
export function getTimeRangeConfigs(): TimeRangeConfig[] {
  const now = new Date();

  // Last week
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 7);
  lastWeekStart.setHours(4, 0, 0, 0);

  const lastWeekEnd = new Date(now);
  lastWeekEnd.setHours(23, 53, 11, 635);

  // Last 30 days
  const last30DaysStart = new Date(now);
  last30DaysStart.setDate(now.getDate() - 30);
  last30DaysStart.setHours(4, 0, 0, 0);

  const last30DaysEnd = new Date(now);
  last30DaysEnd.setHours(23, 54, 36, 715);

  return [
    {
      label: "Last Week",
      value: "last-week",
      exclude_transcripts: true,
      meeting_chat_date_range: {
        start_date: lastWeekStart.toISOString(),
        end_date: lastWeekEnd.toISOString(),
      },
    },
    {
      label: "Last 30 Days",
      value: "last-30d",
      exclude_transcripts: true,
      meeting_chat_date_range: {
        start_date: last30DaysStart.toISOString(),
        end_date: last30DaysEnd.toISOString(),
      },
    },
    {
      label: "All Documents",
      value: "all",
      exclude_transcripts: true,
      meeting_chat_date_range: {},
    },
    {
      label: "Use Transcripts (Max 25)",
      value: "transcripts",
      exclude_transcripts: false,
      meeting_chat_date_range: {},
    },
  ];
}

/**
 * Filter documents based on time range configuration
 */
export function filterDocumentsByTimeRange(
  documents: Record<string, DocumentMetadata>,
  timeRange: TimeRangeConfig,
): string[] {
  const documentEntries = Object.entries(documents);

  // If no date range specified, return all documents
  if (!timeRange.meeting_chat_date_range.start_date || !timeRange.meeting_chat_date_range.end_date) {
    return documentEntries.map(([id]) => id);
  }

  const startDate = new Date(timeRange.meeting_chat_date_range.start_date);
  const endDate = new Date(timeRange.meeting_chat_date_range.end_date);

  return documentEntries
    .filter(([, doc]) => {
      const updatedAt = new Date(doc.updated_at);
      return updatedAt >= startDate && updatedAt <= endDate;
    })
    .map(([id]) => id);
}

/**
 * Update document notes with markdown content
 */
export async function updateDocumentNotes(documentId: string, markdownContent: string): Promise<void> {
  const headers = await createHeaders();

  // Parse markdown to Granola format
  const { notes, notesMarkdown, notesPlain } = parseMarkdownToNotes(markdownContent);

  const payload = {
    id: documentId,
    notes,
    notes_markdown: notesMarkdown,
    notes_plain: notesPlain,
    updated_at: new Date().toISOString().replace("Z", "") + "Z",
  };

  const response = await fetch(`${API_CONFIG.API_URL}/update-document`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response, "Update document notes");
  }
}

/**
 * Fetch upcoming calendar events from Google via Granola API
 */
export async function fetchUpcomingEvents(): Promise<CalendarEvent[]> {
  const headers = await createHeaders({
    Accept: "application/json",
  });

  // First refresh events from Google
  const refreshResponse = await fetch(`${API_CONFIG.API_URL}/refresh-google-events`, {
    method: "POST",
    headers,
    body: JSON.stringify({ selected_calendars_only: true }),
  });

  if (!refreshResponse.ok) {
    await handleApiError(refreshResponse, "Refresh Google events");
  }

  const data = await refreshResponse.json();

  // Extract events from the response
  const allEvents: CalendarEvent[] = [];
  const results = data.results || [];

  for (const result of results) {
    const events = result.events || [];
    allEvents.push(...events);
  }

  // Filter for upcoming events only
  const now = new Date();
  const upcomingEvents: CalendarEvent[] = [];

  for (const event of allEvents) {
    const startTime = parseEventTime(event.start || {});

    if (startTime && startTime > now) {
      upcomingEvents.push(event);
    }
  }

  // Sort by start time
  upcomingEvents.sort((a, b) => {
    const timeA = parseEventTime(a.start || {}) || new Date(0);
    const timeB = parseEventTime(b.start || {}) || new Date(0);
    return timeA.getTime() - timeB.getTime();
  });

  return upcomingEvents;
}

// Document matching functionality moved to ./documentMatching.ts
export { findDocumentForEvent, parseEventTime } from "./documentMatching";

/**
 * Create a new Granola document from a calendar event
 */
export async function createDocumentFromEvent(event: CalendarEvent): Promise<{ id: string; title?: string } | null> {
  const userInfo = await getUserInfo();
  const headers = await createHeaders({
    Accept: "*/*",
  });

  const documentId = generateUUID();
  const title = event.summary || "Meeting";

  // Use event's start time for proper document timing in Granola
  const eventStartTime = parseEventTime(event.start || {});
  const eventTimestamp = eventStartTime ? eventStartTime.toISOString() : new Date().toISOString();

  const payload = {
    id: documentId,
    user_id: userInfo.id,
    title,
    cloned_from: null,
    chapters: null,
    created_at: eventTimestamp,
    updated_at: eventTimestamp,
    type: null,
    deleted_at: null,
    notes: null,
    notes_plain: null,
    notes_markdown: null,
    overview: null,
    transcribe: true,
    google_calendar_event: event,
    public: false,
    people: null,
    meeting_end_count: 0,
    selected_template: null,
    valid_meeting: null,
    summary: null,
    affinity_note_id: null,
    hubspot_note_url: null,
    sharing_link_visibility: "public",
    show_private_notes: false,
    attachments: null,
    visibility: null,
    workspace_id: null,
    transcript_deleted_at: null,
    creation_source: "macOS",
  };

  const response = await fetch(`${API_CONFIG.API_URL}/create-document`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response, "Create document from event");
  }

  return {
    id: documentId,
    title,
  };
}

// Helper function to parse markdown to Granola's document format
function parseMarkdownToNotes(markdownText: string): {
  notes: Record<string, unknown>;
  notesMarkdown: string;
  notesPlain: string;
} {
  const lines = markdownText.trim().split("\n");
  const content: Record<string, unknown>[] = [];
  const plainTextLines: string[] = [];

  for (const line of lines) {
    const stripped = line.trim();

    if (!stripped) {
      // Empty line
      content.push({
        type: "paragraph",
        attrs: { id: generateUUID(), timestamp: null, "timestamp-to": null },
      });
      plainTextLines.push("");
    } else if (stripped.match(/^#{1,6}\s+/)) {
      // Heading
      const match = stripped.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        content.push({
          type: "heading",
          attrs: { id: generateUUID(), level, timestamp: null, "timestamp-to": null },
          content: [{ type: "text", text }],
        });
        plainTextLines.push(text);
      }
    } else if (stripped.match(/^[-*]\s+\[([ xX])\]\s+/)) {
      // Task item
      const match = stripped.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
      if (match) {
        const isChecked = match[1].toLowerCase() === "x";
        const text = match[2];
        content.push({
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { id: generateUUID(), checked: isChecked },
              content: [
                {
                  type: "paragraph",
                  attrs: { id: generateUUID(), timestamp: null, "timestamp-to": null },
                  content: [{ type: "text", text }],
                },
              ],
            },
          ],
        });
        plainTextLines.push(`[${isChecked ? "x" : " "}] ${text}`);
      }
    } else if (stripped.match(/^[-*]\s+/)) {
      // Bullet point
      const match = stripped.match(/^[-*]\s+(.*)$/);
      if (match) {
        const text = match[1];
        content.push({
          type: "bulletList",
          content: [
            {
              type: "listItem",
              attrs: { id: generateUUID() },
              content: [
                {
                  type: "paragraph",
                  attrs: { id: generateUUID(), timestamp: null, "timestamp-to": null },
                  content: [{ type: "text", text }],
                },
              ],
            },
          ],
        });
        plainTextLines.push(`• ${text}`);
      }
    } else {
      // Regular paragraph
      content.push({
        type: "paragraph",
        attrs: { id: generateUUID(), timestamp: null, "timestamp-to": null },
        content: [{ type: "text", text: stripped }],
      });
      plainTextLines.push(stripped);
    }
  }

  const notes = { type: "doc", content };
  const notesPlain = plainTextLines.join("\n");

  return {
    notes,
    notesMarkdown: markdownText.trim(),
    notesPlain,
  };
}
