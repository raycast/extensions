import { LocalStorage } from "@raycast/api";
import { createHash } from "crypto";
import { createReadStream } from "fs";
import { readdir, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { createInterface } from "readline";
const SNIPPETS_KEY = "claude-messages-snippets";

// Type definitions for JSONL file content
type ContentItem = {
  type: string;
  text?: string;
};

type JSONLMessage = {
  role: "user" | "assistant" | "system";
  content: string | ContentItem[];
};

type JSONLData = {
  message?: JSONLMessage;
  timestamp?: string | number;
};

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  sessionId: string;
  projectPath?: string;
};

export type ParsedMessage = Message & {
  id: string;
  preview: string;
};

const CLAUDE_DIR = join(homedir(), ".claude", "projects");

// Configuration constants
const MAX_PROJECTS_TO_SCAN = 5;
const MAX_FILES_PER_PROJECT = 5;
const MAX_MESSAGES_PER_FILE = 10;
const UNIX_TIMESTAMP_THRESHOLD = 10000000000; // Timestamps below this are in seconds, not milliseconds

/**
 * Convert Unix timestamp (seconds) to JavaScript Date object
 * Handles both seconds and milliseconds timestamps
 */
function parseTimestamp(timestamp: string | number | undefined): Date {
  if (!timestamp) return new Date();

  if (typeof timestamp === "number") {
    // If timestamp is in seconds (< threshold), convert to milliseconds
    return new Date(timestamp < UNIX_TIMESTAMP_THRESHOLD ? timestamp * 1000 : timestamp);
  }

  // String timestamp - let Date constructor handle it
  return new Date(timestamp);
}

/**
 * Memory-efficient streaming parser for user messages only
 * Reads JSONL files line-by-line instead of loading entire file into memory
 * This prevents out-of-memory crashes with large conversation files
 */
async function parseUserMessagesOnlyStreaming(
  filePath: string,
  sessionId: string,
  projectPath: string,
): Promise<Message[]> {
  return new Promise((resolve) => {
    const userMessages: Message[] = [];
    let fileStream: ReturnType<typeof createReadStream> | null = null;
    let rl: ReturnType<typeof createInterface> | null = null;

    // Clean up resources to prevent memory leaks
    const cleanup = () => {
      try {
        if (rl) {
          rl.close();
          rl.removeAllListeners();
          rl = null;
        }
        if (fileStream) {
          fileStream.destroy();
          fileStream = null;
        }
      } catch {
        // Ignore cleanup errors
      }
    };

    try {
      fileStream = createReadStream(filePath);

      rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity,
        terminal: false,
      });

      rl.on("line", (line: string) => {
        try {
          if (!line.trim()) return;

          const data: JSONLData = JSON.parse(line);

          if (data.message && data.message.role === "user") {
            let content = "";

            if (data.message.content) {
              if (typeof data.message.content === "string") {
                content = data.message.content;
              } else if (Array.isArray(data.message.content)) {
                content = data.message.content
                  .filter((item: ContentItem) => item.type === "text")
                  .map((item: ContentItem) => item.text || "")
                  .join("\n");
              }
            }

            if (
              content &&
              content.trim() &&
              !content.includes("<command-message>") &&
              !content.includes("<command-name>") &&
              !content.includes("[Request interrupted")
            ) {
              const timestamp = parseTimestamp(data.timestamp);

              userMessages.push({
                role: "user",
                content,
                timestamp,
                sessionId,
                projectPath,
              });
            }
          }
        } catch {
          // Skip invalid JSON
        }
      });

      rl.on("close", () => {
        cleanup();
        const recentMessages = userMessages
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, MAX_MESSAGES_PER_FILE);
        resolve(recentMessages);
      });

      rl.on("error", () => {
        cleanup();
        resolve([]);
      });

      fileStream.on("error", () => {
        cleanup();
        resolve([]);
      });
    } catch {
      cleanup();
      resolve([]);
    }
  });
}

async function parseAssistantMessagesOnlyStreaming(
  filePath: string,
  sessionId: string,
  projectPath: string,
): Promise<Message[]> {
  return new Promise((resolve) => {
    const assistantMessages: Message[] = [];
    let fileStream: ReturnType<typeof createReadStream> | null = null;
    let rl: ReturnType<typeof createInterface> | null = null;

    const cleanup = () => {
      try {
        if (rl) {
          rl.close();
          rl.removeAllListeners();
          rl = null;
        }
        if (fileStream) {
          fileStream.destroy();
          fileStream = null;
        }
      } catch {
        // Ignore cleanup errors
      }
    };

    try {
      fileStream = createReadStream(filePath);
      rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity,
        terminal: false,
      });

      rl.on("line", (line: string) => {
        try {
          if (!line.trim()) return;

          const data: JSONLData = JSON.parse(line);

          if (data.message && data.message.role === "assistant") {
            let content: string | null = "";

            if (data.message.content !== undefined) {
              if (data.message.content === null) {
                content = null;
              } else if (typeof data.message.content === "string") {
                content = data.message.content;
              } else if (Array.isArray(data.message.content)) {
                content = data.message.content
                  .filter((item: ContentItem) => item.type === "text")
                  .map((item: ContentItem) => item.text || "")
                  .join("\n");
              }
            }

            const timestamp = parseTimestamp(data.timestamp);

            if (content === null) {
              assistantMessages.push({
                role: "assistant",
                content: "",
                timestamp,
                sessionId,
                projectPath,
              });
            } else if (content !== undefined && content !== "") {
              assistantMessages.push({
                role: "assistant",
                content: content,
                timestamp,
                sessionId,
                projectPath,
              });
            }
          }
        } catch {
          // Skip invalid JSON
        }
      });

      rl.on("close", () => {
        cleanup();
        const recentMessages = assistantMessages
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, MAX_MESSAGES_PER_FILE);
        resolve(recentMessages);
      });

      rl.on("error", () => {
        cleanup();
        resolve([]);
      });

      fileStream.on("error", () => {
        cleanup();
        resolve([]);
      });
    } catch {
      cleanup();
      resolve([]);
    }
  });
}

export async function getAllClaudeMessages(): Promise<Message[]> {
  try {
    // Get projects and sort by most recent file activity (not directory mtime)
    const projects = await readdir(CLAUDE_DIR);
    const projectsWithStats = [];

    for (const project of projects) {
      try {
        const projectPath = join(CLAUDE_DIR, project);
        const projectStat = await stat(projectPath);
        if (projectStat.isDirectory()) {
          // Get the most recent file modification time in this project
          let mostRecentFileTime = projectStat.mtime;
          try {
            const files = await readdir(projectPath);
            const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

            for (const file of jsonlFiles) {
              const fileStat = await stat(join(projectPath, file));
              if (fileStat.mtime > mostRecentFileTime) {
                mostRecentFileTime = fileStat.mtime;
              }
            }
          } catch {
            // If we can't read files, use directory mtime
          }

          projectsWithStats.push({
            name: project,
            path: projectPath,
            mtime: mostRecentFileTime, // Use most recent file time
          });
        }
      } catch {
        continue;
      }
    }

    // Sort by most recent first (based on file activity, not directory)
    const sortedProjects = projectsWithStats
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      .slice(0, MAX_PROJECTS_TO_SCAN);

    const allMessages: Message[] = [];

    // Process projects sequentially
    for (const project of sortedProjects) {
      try {
        const files = await readdir(project.path);
        const jsonlFiles = files.filter((file) => file.endsWith(".jsonl"));

        // Get stats for ALL jsonl files to sort properly
        const filesWithStats = [];
        for (const file of jsonlFiles) {
          try {
            const filePath = join(project.path, file);
            const fileStat = await stat(filePath);
            filesWithStats.push({
              name: file,
              path: filePath,
              mtime: fileStat.mtime,
            });
          } catch {
            continue;
          }
        }

        // Sort by modification time and take only the most recent files
        const sortedFiles = filesWithStats
          .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
          .slice(0, MAX_FILES_PER_PROJECT);

        // Process files sequentially using streaming
        for (const file of sortedFiles) {
          try {
            const sessionId = file.name.replace(".jsonl", "");

            // Use streaming parser for memory efficiency
            const messages = await parseAssistantMessagesOnlyStreaming(file.path, sessionId, project.path);
            allMessages.push(...messages);
          } catch {
            continue;
          }
        }

        // Don't break early - scan all 5 projects
      } catch {
        continue;
      }
    }

    // Sort by timestamp (newest first) and take only assistant messages
    const assistantMessages = allMessages
      .filter((msg) => msg.role === "assistant")
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return assistantMessages;
  } catch {
    return [];
  }
}

/**
 * Gets the most recent user messages (messages sent TO Claude) across all projects
 * Uses memory-efficient streaming to avoid crashes with large conversation histories
 */
export async function getSentMessages(): Promise<ParsedMessage[]> {
  try {
    // STEP 1: Find all Claude Code projects and get their actual file activity times
    const projects = await readdir(CLAUDE_DIR); // Read ~/.claude/projects/ directory
    const projectsWithStats = [];

    // Get most recent file modification time for each project (not directory mtime)
    for (const project of projects) {
      try {
        const projectPath = join(CLAUDE_DIR, project);
        const projectStat = await stat(projectPath);
        if (projectStat.isDirectory()) {
          // Get the most recent file modification time in this project
          let mostRecentFileTime = projectStat.mtime;
          try {
            const files = await readdir(projectPath);
            const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

            for (const file of jsonlFiles) {
              const fileStat = await stat(join(projectPath, file));
              if (fileStat.mtime > mostRecentFileTime) {
                mostRecentFileTime = fileStat.mtime;
              }
            }
          } catch {
            // If we can't read files, use directory mtime as fallback
          }

          projectsWithStats.push({
            name: project,
            path: projectPath,
            mtime: mostRecentFileTime, // Use most recent file time to detect active sessions
          });
        }
      } catch {
        continue;
      }
    }

    // STEP 2: Sort projects by most recent file activity and take only the top ones
    const sortedProjects = projectsWithStats
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()) // Most recent file activity first
      .slice(0, MAX_PROJECTS_TO_SCAN); // Only process most recently active projects

    // Array to collect ALL user messages from ALL projects before final sorting
    const topUserMessages: Message[] = [];

    // STEP 3: Process each of the 5 selected projects to find conversation files
    for (const project of sortedProjects) {
      try {
        // Get all conversation files (.jsonl) in this project
        const files = await readdir(project.path);
        const jsonlFiles = files.filter((file) => file.endsWith(".jsonl")); // Each .jsonl = one conversation session

        // STEP 4: Find the most recent conversation files in this project
        // We need to sort by modification time to get the latest conversations
        const filesWithStats = [];

        // Get modification time for ALL files first (before limiting)
        // This was the bug fix - we were limiting BEFORE sorting, which chose wrong files
        for (const file of jsonlFiles) {
          try {
            const filePath = join(project.path, file);
            const fileStat = await stat(filePath);
            filesWithStats.push({
              name: file,
              path: filePath,
              mtime: fileStat.mtime, // When this conversation file was last modified
            });
          } catch {
            continue;
          }
        }

        // Sort files by newest first, then take only the 2 most recent conversation files
        const sortedFiles = filesWithStats
          .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()) // Newest conversations first
          .slice(0, MAX_FILES_PER_PROJECT); // Only process 5 most recent conversation files per project

        // STEP 5: Process each conversation file using streaming
        for (const file of sortedFiles) {
          try {
            const sessionId = file.name.replace(".jsonl", ""); // Extract session ID from filename

            // Stream through the file line-by-line to extract user messages
            // This avoids loading huge files into memory all at once
            const userMessages = await parseUserMessagesOnlyStreaming(file.path, sessionId, project.path);

            // Add all user messages from this file to our collection
            topUserMessages.push(...userMessages);
          } catch {
            continue;
          }
        }
      } catch {
        continue;
      }
    }

    // STEP 6: Final sorting across ALL projects
    // Now we have user messages from multiple projects/conversations
    // Sort them globally by timestamp to get the most recent messages overall
    const finalMessages = topUserMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Newest messages first across ALL projects

    // STEP 7: Format messages for Raycast display
    return finalMessages.map((msg, index) => ({
      ...msg,
      id: `sent-${index}`, // Unique ID for Raycast
      preview: msg.content.slice(0, 100) + (msg.content.length > 100 ? "..." : ""), // Preview text for list
    }));
  } catch {
    return [];
  }
}

export async function getReceivedMessages(): Promise<ParsedMessage[]> {
  const allMessages = await getAllClaudeMessages();

  const assistantMessages = allMessages.filter((msg) => msg.role === "assistant");

  const parsedMessages = assistantMessages.map((msg, index) => {
    const preview = msg.content
      ? msg.content.slice(0, 100) + (msg.content.length > 100 ? "..." : "")
      : "[Empty message]";
    return {
      ...msg,
      id: `received-${index}`,
      preview: preview,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
    };
  });

  return parsedMessages;
}

export type Snippet = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Get all snippets from LocalStorage
 */
export async function getSnippets(): Promise<Snippet[]> {
  try {
    const snippetsData = await LocalStorage.getItem<string>(SNIPPETS_KEY);
    if (!snippetsData) return [];

    const snippets: Snippet[] = JSON.parse(snippetsData);
    return snippets.map((snippet) => ({
      ...snippet,
      createdAt: new Date(snippet.createdAt),
      updatedAt: new Date(snippet.updatedAt),
    }));
  } catch {
    return [];
  }
}

/**
 * Create a new snippet
 */
export async function createSnippet(title: string, content: string): Promise<Snippet> {
  try {
    const snippetsData = await LocalStorage.getItem<string>(SNIPPETS_KEY);
    let snippets: Snippet[] = [];

    // Handle JSON parse errors gracefully
    if (snippetsData) {
      try {
        snippets = JSON.parse(snippetsData);
      } catch {
        snippets = [];
      }
    }

    const newSnippet: Snippet = {
      id: createHash("md5").update(`${title}-${content}-${Date.now()}`).digest("hex"),
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    snippets.push(newSnippet);
    await LocalStorage.setItem(SNIPPETS_KEY, JSON.stringify(snippets));

    return newSnippet;
  } catch {
    throw new Error("Failed to create snippet");
  }
}

/**
 * Delete a snippet
 */
export async function deleteSnippet(id: string): Promise<void> {
  try {
    const snippetsData = await LocalStorage.getItem<string>(SNIPPETS_KEY);
    if (!snippetsData) return;

    let snippets: Snippet[] = JSON.parse(snippetsData);
    snippets = snippets.filter((s) => s.id !== id);

    await LocalStorage.setItem(SNIPPETS_KEY, JSON.stringify(snippets));
  } catch {
    throw new Error("Failed to delete snippet");
  }
}
