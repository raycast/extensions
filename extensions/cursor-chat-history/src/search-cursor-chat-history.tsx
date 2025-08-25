import { Action, ActionPanel, List, showToast, Toast, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { execSync } from "child_process";

// Constants
const SESSION_QUERY_LIMIT = 50;
const TITLE_MAX_LENGTH = 80;
const CONTENT_PREVIEW_LENGTH = 500;
const ACTIVE_SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const RECENT_SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const QUERY_TIMEOUT = 10000; // 10 seconds

// Types
interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  workspace: string;
  status?: "active" | "recent" | "completed";
  sessionKey: string;
}

interface ChatData extends ChatSession {
  content: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

interface ParsedValue {
  parseError?: boolean;
  reason?: string;
  [key: string]: unknown;
}

interface BubbleData {
  type?: number;
  text?: string;
  thinking?: { text?: string };
  richText?: string;
  intermediateChunks?: unknown[];
  toolResults?: unknown[];
  toolFormerData?: { result?: string };
  codeBlocks?: unknown[];
  suggestedCodeBlocks?: unknown[];
  attachedCodeChunks?: unknown[];
}

interface RichTextNode {
  type?: string;
  text?: string;
  content?: RichTextNode[];
  children?: RichTextNode[];
  attrs?: { level?: number; params?: string; language?: string; lang?: string };
}

interface RichTextData {
  root?: { children?: RichTextNode[] };
}

interface SessionData {
  createdAt?: number;
  lastUpdatedAt?: number;
  status?: string;
  name?: string;
  text?: string;
  fullConversationHeadersOnly?: Array<{ bubbleId?: string }>;
  parseError?: boolean;
  [key: string]: unknown;
}

interface CodeBlock {
  code?: string;
  content?: string;
  language?: string;
  languageId?: string;
  lang?: string;
  fileExtension?: string;
}

interface ChunkData {
  text?: string;
  content?: string;
  value?: string;
}

interface ToolResult {
  output?: string;
  result?: string;
  text?: string;
}

interface DiffChunk {
  diffString?: string;
}

interface ParsedToolResult {
  diff?: { chunks?: DiffChunk[] };
  codeResults?: unknown[];
  output?: string;
}

interface CodeResult {
  codeBlock?: {
    relativeWorkspacePath?: string;
    range?: {
      start: { line: number };
      end: { line: number };
    };
  };
}

/**
 * Get the Cursor global storage directory based on the current platform
 */
function getCursorGlobalDataDir(): string {
  const platform = process.platform;

  if (platform === "win32") {
    return join(process.env.APPDATA || "", "Cursor", "User", "globalStorage");
  } else if (platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "Cursor", "User", "globalStorage");
  } else {
    return join(homedir(), ".config", "Cursor", "User", "globalStorage");
  }
}

/**
 * Escape single quotes for SQLite string literals
 */
function escapeSqliteString(value: string): string {
  if (typeof value !== "string") {
    throw new Error("Value must be a string");
  }
  // Replace single quotes with two single quotes (SQLite standard)
  return value.replace(/'/g, "''");
}

/**
 * Validate that a string contains only safe characters for database keys
 */
function validateDatabaseKey(key: string): boolean {
  // Allow alphanumeric characters, colons, hyphens, underscores, and dots
  // This covers Cursor's session and bubble ID formats
  const safeKeyPattern = /^[a-zA-Z0-9:._-]+$/;
  return safeKeyPattern.test(key) && key.length > 0 && key.length < 500;
}

/**
 * Validate session or bubble ID format
 */
function validateId(id: string): boolean {
  // More specific validation for IDs - alphanumeric, hyphens, and underscores only
  const idPattern = /^[a-zA-Z0-9_-]+$/;
  return idPattern.test(id) && id.length > 0 && id.length < 200;
}

/**
 * Execute a SQLite query safely with timeout and input validation
 */
function queryDatabase(dbPath: string, query: string): string {
  try {
    const result = execSync(`sqlite3 "${dbPath}" "${query}"`, {
      encoding: "utf8",
      timeout: QUERY_TIMEOUT,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer to prevent ENOBUFS
    });
    return result.trim();
  } catch {
    return "";
  }
}

/**
 * Parse a value using multiple strategies (JSON, Base64, URL decode, etc.)
 */
function parseValueWithMultipleStrategies(value: string): ParsedValue {
  if (!value || value.trim().length === 0) {
    return { parseError: true, reason: "Empty value" };
  }

  // Strategy 1: Direct JSON parsing
  try {
    return JSON.parse(value);
  } catch {
    // Strategy 2: Base64 decode then JSON parse
    try {
      const decoded = Buffer.from(value, "base64").toString("utf-8");
      return JSON.parse(decoded);
    } catch {
      // Strategy 3: URL decode then JSON parse
      try {
        const urlDecoded = decodeURIComponent(value);
        return JSON.parse(urlDecoded);
      } catch {
        // Strategy 4: Handle escaped JSON
        try {
          const unescaped = value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
          return JSON.parse(unescaped);
        } catch {
          return { parseError: true, reason: "All parsing strategies failed" };
        }
      }
    }
  }
}

/**
 * Determine session status based on timestamps
 */
function determineSessionStatus(sessionData: SessionData): "active" | "recent" | "completed" {
  const now = Date.now();
  const createdAt = sessionData.createdAt || now;
  const lastUpdated = sessionData.lastUpdatedAt || createdAt;

  const isActive = sessionData.status === "active" || now - lastUpdated < ACTIVE_SESSION_TIMEOUT;
  const isRecent = now - lastUpdated < RECENT_SESSION_TIMEOUT;

  if (isActive) return "active";
  if (isRecent) return "recent";
  return "completed";
}

/**
 * Generate a meaningful title from session data
 */
function generateSessionTitle(sessionData: SessionData, sessionId: string): string {
  if (sessionData.name && sessionData.name.trim()) {
    return sessionData.name.trim();
  }

  if (sessionData.text && sessionData.text.trim()) {
    const title = sessionData.text.trim().substring(0, TITLE_MAX_LENGTH);
    return title.length === TITLE_MAX_LENGTH ? title + "..." : title;
  }

  return `Session ${sessionId.substring(0, 8)}...`;
}

/**
 * Check if session has meaningful content
 */
function hasValidContent(sessionData: SessionData, title: string): boolean {
  if (title !== "Untitled Session" && !title.startsWith("Session ")) {
    return true;
  }

  return !!(
    sessionData.fullConversationHeadersOnly &&
    Array.isArray(sessionData.fullConversationHeadersOnly) &&
    sessionData.fullConversationHeadersOnly.length > 0
  );
}

/**
 * Extract global chat sessions with lightweight processing
 */
async function extractGlobalSessions(): Promise<ChatSession[]> {
  const sessions: ChatSession[] = [];
  const globalDataDir = getCursorGlobalDataDir();
  const dbPath = join(globalDataDir, "state.vscdb");

  if (!existsSync(dbPath)) {
    return [];
  }

  const dataKeysQuery = `SELECT [key], value FROM cursorDiskKV WHERE [key] LIKE 'composerData:%' ORDER BY [key] DESC LIMIT ${SESSION_QUERY_LIMIT};`;
  const dataKeysResult = queryDatabase(dbPath, dataKeysQuery);

  if (!dataKeysResult) {
    return [];
  }

  const lines = dataKeysResult.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    const firstPipeIndex = line.indexOf("|");
    if (firstPipeIndex === -1 || firstPipeIndex === 0) {
      continue;
    }

    const key = line.substring(0, firstPipeIndex);
    const value = line.substring(firstPipeIndex + 1);
    const sessionId = key.replace("composerData:", "");

    try {
      const sessionData = parseValueWithMultipleStrategies(value) as SessionData;

      if (sessionData && !sessionData.parseError) {
        const title = generateSessionTitle(sessionData, sessionId);

        if (!hasValidContent(sessionData, title)) {
          continue;
        }

        const status = determineSessionStatus(sessionData);
        const lastUpdated = sessionData.lastUpdatedAt || sessionData.createdAt || Date.now();

        sessions.push({
          id: sessionId,
          title,
          timestamp: lastUpdated,
          workspace: "",
          status,
          sessionKey: key,
        });
      }
    } catch {
      // Skip sessions that fail to process
    }
  }

  return sessions;
}

/**
 * Get all chat sessions and sort them by priority
 */
async function getAllSessions(): Promise<ChatSession[]> {
  const allSessions: ChatSession[] = [];

  try {
    const globalSessions = await extractGlobalSessions();
    allSessions.push(...globalSessions);

    // Sort by status and timestamp
    allSessions.sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (b.status === "active" && a.status !== "active") return 1;
      if (a.status === "recent" && b.status === "completed") return -1;
      if (b.status === "recent" && a.status === "completed") return 1;
      return b.timestamp - a.timestamp;
    });
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: "Error Loading Sessions",
      message: "Failed to load chat sessions",
    });
  }

  return allSessions;
}

/**
 * Extract text content from RichText node recursively
 */
function extractFromRichTextNodes(nodes: RichTextNode[]): string {
  if (!Array.isArray(nodes)) return "";

  let text = "";
  for (const node of nodes) {
    if (!node) continue;

    switch (node.type) {
      case "text":
        text += node.text || "";
        break;
      case "paragraph":
        text += extractNodeContent(node) + "\n\n";
        break;
      case "heading": {
        const level = node.attrs?.level || 1;
        const prefix = "#".repeat(level) + " ";
        text += prefix + extractNodeContent(node) + "\n\n";
        break;
      }
      case "codeblock":
      case "code":
      case "codeBlock":
        text += formatCodeBlock(node) + "\n\n";
        break;
      case "listItem":
        text += "• " + extractNodeContent(node) + "\n";
        break;
      case "blockquote":
        text += "> " + extractNodeContent(node) + "\n\n";
        break;
      default:
        text += extractNodeContent(node);
        break;
    }
  }
  return text;
}

/**
 * Extract content from a RichText node (children and content)
 */
function extractNodeContent(node: RichTextNode): string {
  let content = "";
  if (node.children) {
    content += extractFromRichTextNodes(node.children);
  }
  if (node.content) {
    content += extractFromRichTextNodes(node.content);
  }
  return content;
}

/**
 * Format a code block node
 */
function formatCodeBlock(node: RichTextNode): string {
  const language = node.attrs?.params || node.attrs?.language || node.attrs?.lang || "";
  let codeContent = extractNodeContent(node);

  if (!codeContent && node.text) {
    codeContent = node.text;
  }

  if (codeContent.trim()) {
    return `\`\`\`${language}\n${codeContent.trim()}\n\`\`\``;
  }

  return "";
}

/**
 * Extract text from RichText JSON string
 */
function extractTextFromRichText(richTextStr: string): string {
  if (!richTextStr || typeof richTextStr !== "string") return "";

  try {
    const richTextData: RichTextData = JSON.parse(richTextStr);
    if (richTextData.root && richTextData.root.children) {
      return extractFromRichTextNodes(richTextData.root.children);
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Process code blocks from various sources
 */
function processCodeBlocks(bubbleData: BubbleData): string[] {
  const contentParts: string[] = [];

  const codeBlockSources = [
    { field: "codeBlocks" as keyof BubbleData, title: "Code Blocks" },
    { field: "suggestedCodeBlocks" as keyof BubbleData, title: "Suggested Code Blocks" },
    { field: "attachedCodeChunks" as keyof BubbleData, title: "Attached Code Chunks" },
  ];

  for (const source of codeBlockSources) {
    const blocks = bubbleData[source.field];
    if (Array.isArray(blocks) && blocks.length > 0) {
      const codeContent = blocks
        .map((codeBlock: unknown) => {
          if (typeof codeBlock === "object" && codeBlock !== null) {
            const block = codeBlock as CodeBlock;
            const code = block.code || block.content;
            if (code) {
              const language = block.language || block.languageId || block.lang || block.fileExtension || "plaintext";
              return `\`\`\`${language}\n${code}\n\`\`\``;
            }
          }
          return "";
        })
        .filter((code) => code)
        .join("\n\n");

      if (codeContent) {
        contentParts.push(`**${source.title}:**\n\n${codeContent}`);
      }
    }
  }

  return contentParts;
}

/**
 * Process tool results and intermediate chunks
 */
function processToolResults(bubbleData: BubbleData): string[] {
  const contentParts: string[] = [];

  // Process intermediate chunks
  if (
    bubbleData.intermediateChunks &&
    Array.isArray(bubbleData.intermediateChunks) &&
    bubbleData.intermediateChunks.length > 0
  ) {
    const chunksText = bubbleData.intermediateChunks
      .map((chunk: unknown) => {
        if (typeof chunk === "string") return chunk;
        if (typeof chunk === "object" && chunk !== null) {
          const chunkData = chunk as ChunkData;
          return chunkData.text || chunkData.content || chunkData.value || "";
        }
        return "";
      })
      .filter((text) => text.trim())
      .join("\n");

    if (chunksText) {
      contentParts.push(`**Intermediate Results:**\n\n${chunksText}`);
    }
  }

  // Process tool results
  if (bubbleData.toolResults && Array.isArray(bubbleData.toolResults) && bubbleData.toolResults.length > 0) {
    const toolText = bubbleData.toolResults
      .map((result: unknown) => {
        if (typeof result === "string") return result;
        if (typeof result === "object" && result !== null) {
          const toolResult = result as ToolResult;
          return toolResult.output || toolResult.result || toolResult.text || "";
        }
        return "";
      })
      .filter((text) => text.trim())
      .join("\n");

    if (toolText) {
      contentParts.push(`**Tool Results:**\n\n${toolText}`);
    }
  }

  // Process ToolFormerData results
  if (bubbleData.toolFormerData && bubbleData.toolFormerData.result) {
    const formattedResult = formatToolFormerResult(bubbleData.toolFormerData.result);
    if (formattedResult) {
      contentParts.push(formattedResult);
    }
  }

  return contentParts;
}

/**
 * Format ToolFormer result based on its content type
 */
function formatToolFormerResult(result: string): string | null {
  if (typeof result !== "string" || !result.trim()) return null;

  try {
    const parsed = JSON.parse(result) as ParsedToolResult;

    if (parsed.diff && parsed.diff.chunks) {
      const diffContent = parsed.diff.chunks.map((chunk: DiffChunk) => chunk.diffString || "").join("\n");
      if (diffContent.trim()) {
        return `**Code Changes:**\n\n\`\`\`diff\n${diffContent}\n\`\`\``;
      }
    } else if (parsed.codeResults && Array.isArray(parsed.codeResults)) {
      return formatCodeSearchResults(parsed.codeResults);
    } else if (parsed.output && typeof parsed.output === "string") {
      return `**Output:**\n\n\`\`\`\n${parsed.output}\n\`\`\``;
    }
  } catch {
    // If JSON parsing fails, return truncated result
    const truncated = result.substring(0, CONTENT_PREVIEW_LENGTH);
    const suffix = result.length > CONTENT_PREVIEW_LENGTH ? "..." : "";
    return `**Tool Result:**\n\n${truncated}${suffix}`;
  }

  return null;
}

/**
 * Format code search results into a readable summary
 */
function formatCodeSearchResults(codeResults: unknown[]): string {
  const summary =
    `Found ${codeResults.length} code references across the project:\n\n` +
    codeResults
      .slice(0, 5)
      .map((result: unknown, index: number) => {
        if (typeof result === "object" && result !== null) {
          const codeResult = result as CodeResult;
          const path = codeResult.codeBlock?.relativeWorkspacePath || "unknown file";
          const lines = codeResult.codeBlock?.range
            ? `lines ${codeResult.codeBlock.range.start.line}-${codeResult.codeBlock.range.end.line}`
            : "unknown range";
          return `${index + 1}. \`${path}\` (${lines})`;
        }
        return `${index + 1}. unknown file`;
      })
      .join("\n") +
    (codeResults.length > 5 ? `\n... and ${codeResults.length - 5} more files` : "");

  return `**Code Analysis Results:**\n\n${summary}`;
}

interface ProcessedBubbleData {
  type?: number;
  text?: string;
  thinking?: { text?: string };
  richText?: string;
  parseError?: boolean;
}

/**
 * Process conversation bubble data into a readable message
 */
function processBubbleData(bubbleData: unknown): { role: "user" | "assistant"; content: string } | null {
  if (
    !bubbleData ||
    (typeof bubbleData === "object" && bubbleData !== null && (bubbleData as { parseError?: boolean }).parseError)
  )
    return null;

  const processedData = bubbleData as ProcessedBubbleData;

  let role: "user" | "assistant";
  if (processedData.type === 1) {
    role = "user";
  } else if (processedData.type === 2) {
    role = "assistant";
  } else {
    return null;
  }

  const contentParts: string[] = [];

  // Primary text content
  if (processedData.text && typeof processedData.text === "string" && processedData.text.trim()) {
    contentParts.push(processedData.text.trim());
  }

  // Thinking content (for assistant messages)
  if (
    role === "assistant" &&
    processedData.thinking &&
    processedData.thinking.text &&
    typeof processedData.thinking.text === "string"
  ) {
    const thinkingText = processedData.thinking.text.trim();
    if (thinkingText && !contentParts.includes(thinkingText)) {
      contentParts.push(`**Thinking Process:**\n\n${thinkingText}`);
    }
  }

  // RichText content (only if no primary text exists)
  if (!contentParts.length && processedData.richText && typeof processedData.richText === "string") {
    const richTextContent = extractTextFromRichText(processedData.richText);
    if (richTextContent && richTextContent.trim()) {
      contentParts.push(richTextContent.trim());
    }
  }

  // Add tool results and code blocks
  contentParts.push(...processToolResults(bubbleData as BubbleData));
  contentParts.push(...processCodeBlocks(bubbleData as BubbleData));

  const content = contentParts.join("\n\n---\n\n");

  if (!content || content.trim().length === 0) {
    return null;
  }

  return {
    role,
    content: content.trim(),
  };
}

/**
 * HEAVY: Get detailed content for a specific session (only when requested)
 */
async function getSessionDetails(session: ChatSession): Promise<ChatData> {
  const globalDataDir = getCursorGlobalDataDir();
  const dbPath = join(globalDataDir, "state.vscdb");

  if (session.sessionKey.startsWith("composerData:")) {
    // Validate session key for security
    if (!validateDatabaseKey(session.sessionKey)) {
      return {
        ...session,
        content: "Invalid session key",
      };
    }

    // Extract detailed content for global session
    const sessionId = session.sessionKey.replace("composerData:", "");

    // Validate session ID
    if (!validateId(sessionId)) {
      return {
        ...session,
        content: "Invalid session ID format",
      };
    }

    const escapedSessionKey = escapeSqliteString(session.sessionKey);
    const sessionDataResult = queryDatabase(
      dbPath,
      `SELECT value FROM cursorDiskKV WHERE [key] = '${escapedSessionKey}';`,
    );

    if (sessionDataResult) {
      const sessionData = parseValueWithMultipleStrategies(sessionDataResult) as SessionData;
      const messages: ConversationMessage[] = [];

      // Process bubbles to get detailed content
      if (sessionData.fullConversationHeadersOnly && Array.isArray(sessionData.fullConversationHeadersOnly)) {
        for (const header of sessionData.fullConversationHeadersOnly) {
          if (header && header.bubbleId) {
            // Validate bubble ID format
            if (!validateId(header.bubbleId)) {
              continue; // Skip invalid bubble IDs
            }

            const bubbleKey = `bubbleId:${sessionId}:${header.bubbleId}`;

            // Validate complete bubble key for security
            if (!validateDatabaseKey(bubbleKey)) {
              continue; // Skip invalid bubble keys
            }

            const escapedBubbleKey = escapeSqliteString(bubbleKey);
            const bubbleResult = queryDatabase(
              dbPath,
              `SELECT value FROM cursorDiskKV WHERE [key] = '${escapedBubbleKey}';`,
            );

            if (bubbleResult) {
              const bubbleData = parseValueWithMultipleStrategies(bubbleResult);
              const processedBubble = processBubbleData(bubbleData);

              if (processedBubble) {
                messages.push({
                  role: processedBubble.role,
                  content: processedBubble.content,
                  timestamp: Date.now(),
                });
              }
            }
          }
        }
      }

      // Build content in Cursor export format
      let content = "";
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];

        if (message.role === "user") {
          content += `**User**\n\n${message.content}\n\n---\n\n`;
        } else if (message.role === "assistant") {
          // Collect all consecutive assistant messages
          const assistantMessages = [message];
          let j = i + 1;
          while (j < messages.length && messages[j].role === "assistant") {
            assistantMessages.push(messages[j]);
            j++;
          }

          // Combine all assistant messages into one Cursor section
          const combinedContent = assistantMessages.map((msg) => msg.content).join("\n\n---\n\n");
          content += `**Cursor**\n\n${combinedContent}\n\n---\n\n`;

          // Skip the processed assistant messages
          i = j - 1;
        }
      }

      // Remove trailing separators
      content = content.replace(/\n---\n\n$/, "");

      return {
        ...session,
        content,
      };
    }
  }

  // Fallback: return session with empty content
  return {
    ...session,
    content: "No content available",
  };
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChatDetail({ session, onBack }: { session: ChatSession; onBack: () => void }): ReactElement {
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDetails() {
      try {
        const details = await getSessionDetails(session);
        setChatData(details);
      } catch {
        setChatData({
          ...session,
          content: "Error loading content",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadDetails();
  }, [session]);

  // Show loading immediately when component mounts
  if (isLoading) {
    return (
      <Detail
        isLoading={true}
        markdown={`# ${session.title}\n\n**Date:** ${formatDate(session.timestamp)}\n\n---\n\nLoading session details...`}
      />
    );
  }

  if (!chatData) {
    return (
      <Detail
        markdown={`# ${session.title}\n\n**Date:** ${formatDate(session.timestamp)}\n\n---\n\nError: Unable to load session details`}
      />
    );
  }

  const markdown = `
# ${chatData.title}

**Date:** ${formatDate(chatData.timestamp)}

---

${chatData.content || "No content available"}
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Back to List" onAction={onBack} shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }} />
          <Action.CopyToClipboard
            title="Copy Content"
            content={chatData.content}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Title"
            content={chatData.title}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function SearchCursorChatHistory(): ReactElement {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);

  useEffect(() => {
    async function loadSessions() {
      setIsLoading(true);
      const data = await getAllSessions();
      setSessions(data);
      setIsLoading(false);

      if (data.length === 0) {
        showToast({
          style: Toast.Style.Success,
          title: "Complete",
          message: "No Cursor chat history found",
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Loading Complete",
          message: `Loaded ${data.length} chat sessions`,
        });
      }
    }

    loadSessions();
  }, []);

  const filteredSessions = sessions.filter((session) => {
    const searchLower = searchText.toLowerCase();
    return session.title.toLowerCase().includes(searchLower);
  });

  // If a session is selected, show the detail view
  if (selectedSession) {
    return <ChatDetail session={selectedSession} onBack={() => setSelectedSession(null)} />;
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Cursor chat history..."
      throttle
    >
      {filteredSessions.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No chat sessions found"
          description={searchText ? "Try changing your search criteria" : "Start using Cursor to see chat history here"}
        />
      ) : (
        filteredSessions.map((session) => {
          return (
            <List.Item
              key={session.id}
              title={session.title}
              accessories={[{ text: formatDate(session.timestamp) }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Show Details"
                    onAction={() => {
                      setIsLoading(true);
                      setTimeout(() => {
                        setSelectedSession(session);
                        setIsLoading(false);
                      }, 1000);
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Title"
                    content={session.title}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
