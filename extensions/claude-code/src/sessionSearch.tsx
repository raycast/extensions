import { List, ActionPanel, Action, showToast, Toast, Icon, confirmAlert, Alert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { readdir, readFile, stat, unlink } from "fs/promises";
import { join, basename } from "path";
import { homedir } from "os";
import {
  executeInTerminal,
  showTerminalSuccessToast,
  showTerminalErrorToast,
  getManualCommand,
} from "./utils/terminalLauncher";
import ProjectSessions from "./projectSessions";

interface SessionEntry {
  sessionId: string;
  timestamp: string;
  cwd: string;
  type: string;
  summary?: string;
  message?: {
    content: string;
  };
}

interface Session {
  id: string;
  description: string;
  directory: string;
  timestamp: Date;
  lastActivity: Date;
  filePath: string;
  isErrorSession: boolean;
}

interface SessionFileInfo {
  filePath: string;
  modifiedTime: Date;
  size: number;
}

// Global loading state to prevent duplicate calls
let isGlobalLoading = false;

// Utility function to extract project name from directory path
const getProjectName = (directoryPath: string): string => {
  // Use the same logic as launchProjects.tsx to extract project name
  return basename(directoryPath) || directoryPath;
};

// Utility function to extract encoded directory name from session file path
const getEncodedDirName = (sessionFilePath: string): string => {
  // Extract the encoded directory name from the file path
  // Path format: ~/.claude/projects/{encodedDirName}/{sessionId}.jsonl
  const pathParts = sessionFilePath.split("/");
  const projectsIndex = pathParts.findIndex((part) => part === "projects");
  if (projectsIndex !== -1 && projectsIndex + 1 < pathParts.length) {
    return pathParts[projectsIndex + 1];
  }
  return "";
};

// Utility function to determine the best description from two session descriptions
const getBestDescription = (desc1: string, desc2: string): string => {
  // Priority:
  // 1. Non-default descriptions over default ones
  // 2. Longer, more informative descriptions
  // 3. Descriptions that don't contain error messages (unless both do)

  const isDefault1 = desc1 === "Claude Code Session";
  const isDefault2 = desc2 === "Claude Code Session";

  // If one is default and other isn't, prefer the non-default one
  if (isDefault1 && !isDefault2) return desc2;
  if (!isDefault1 && isDefault2) return desc1;

  // If both are default, return either one
  if (isDefault1 && isDefault2) return desc1;

  // Both are non-default, prefer the longer one (likely has more context)
  // But avoid very long descriptions that might be truncated messages
  if (desc1.length > desc2.length && desc1.length < 150) return desc1;
  if (desc2.length > desc1.length && desc2.length < 150) return desc2;

  // If lengths are similar, prefer the one that looks like a summary
  // Summaries usually don't end with "..." (which indicates truncated user messages)
  if (!desc1.endsWith("...") && desc2.endsWith("...")) return desc1;
  if (!desc2.endsWith("...") && desc1.endsWith("...")) return desc2;

  // Default to the first one
  return desc1;
};

export default function SessionSearch() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (isMounted && !isGlobalLoading) {
        isGlobalLoading = true;
        await loadSessions();
        isGlobalLoading = false;
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadSessions = async () => {
    console.log("🔄 Starting loadSessions...");
    const startTime = Date.now();
    const TIMEOUT_MS = 10000; // 10 second timeout

    try {
      setIsLoading(true);
      setError(null);

      const claudeProjectsPath = join(homedir(), ".claude", "projects");

      // Get all session files with metadata
      const allSessionFiles = await getAllSessionFiles(claudeProjectsPath);

      if (Date.now() - startTime > TIMEOUT_MS) {
        throw new Error("Session loading timeout");
      }

      // Sort by modification time and take more files for parsing to ensure we have enough valid sessions
      const recentFiles = allSessionFiles
        .sort((a, b) => b.modifiedTime.getTime() - a.modifiedTime.getTime())
        .slice(0, 100);

      console.log(`Loading ${recentFiles.length} most recent session files...`);
      console.log(
        `Recent files:`,
        recentFiles.map((f) => ({ path: f.filePath, size: f.size })),
      );

      // Process files sequentially to avoid memory spikes
      const allSessions: Session[] = [];
      for (const fileInfo of recentFiles) {
        // Check timeout before processing each file
        if (Date.now() - startTime > TIMEOUT_MS) {
          console.log("Timeout reached, stopping session loading");
          break;
        }

        try {
          console.log(`Parsing file: ${fileInfo.filePath.split("/").pop()}`);
          const session = await parseSessionFile(fileInfo.filePath);
          if (session) {
            console.log(`✅ Successfully parsed session: ${session.id}`);
            allSessions.push(session);
          } else {
            console.log(`❌ Failed to parse session from: ${fileInfo.filePath.split("/").pop()}`);
          }
        } catch (err) {
          console.error(`Error parsing session file ${fileInfo.filePath}:`, err);
          // Continue with other files
        }

        // Force garbage collection hint after each file
        if (global.gc) {
          global.gc();
        }
      }

      // Merge duplicate sessions by sessionId
      const sessionMap = new Map<string, Session>();
      let duplicateCount = 0;

      for (const session of allSessions) {
        const existing = sessionMap.get(session.id);
        if (existing) {
          duplicateCount++;
          console.log(`🔄 Merging duplicate session: ${session.id}`);
          console.log(`  Existing: ${existing.description} (${existing.lastActivity.toISOString()})`);
          console.log(`  New: ${session.description} (${session.lastActivity.toISOString()})`);

          // Merge logic: keep the best information from both sessions
          const merged: Session = {
            id: session.id,
            // Prefer summary-based descriptions over default ones
            description: getBestDescription(existing.description, session.description),
            // Keep the directory from the more recent session
            directory: session.lastActivity > existing.lastActivity ? session.directory : existing.directory,
            // Keep the earlier timestamp (session start)
            timestamp: existing.timestamp < session.timestamp ? existing.timestamp : session.timestamp,
            // Keep the latest activity
            lastActivity: session.lastActivity > existing.lastActivity ? session.lastActivity : existing.lastActivity,
            // Keep the file path with the most recent activity
            filePath: session.lastActivity > existing.lastActivity ? session.filePath : existing.filePath,
            // Mark as error session if either is an error session
            isErrorSession: existing.isErrorSession || session.isErrorSession,
          };

          sessionMap.set(session.id, merged);
          console.log(`  Merged result: ${merged.description} (${merged.lastActivity.toISOString()})`);
        } else {
          sessionMap.set(session.id, session);
        }
      }

      if (duplicateCount > 0) {
        console.log(`📊 Merged ${duplicateCount} duplicate sessions`);
      }

      // Convert map back to array and filter/sort
      const mergedSessions = Array.from(sessionMap.values());
      const validSessions = mergedSessions
        .filter((session) => !session.isErrorSession)
        .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
        .slice(0, 30);

      setSessions(validSessions);
      console.log(`Loaded ${validSessions.length} valid sessions in ${Date.now() - startTime}ms`);
    } catch (err) {
      console.error("Error loading sessions:", err);
      if (err instanceof Error && err.message.includes("timeout")) {
        setError("Session loading timed out. Try again or reduce the number of Claude Code projects.");
      } else {
        setError("Failed to load Claude Code sessions. Make sure Claude Code CLI is installed and has been used.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getAllSessionFiles = async (claudeProjectsPath: string): Promise<SessionFileInfo[]> => {
    const allFiles: SessionFileInfo[] = [];

    try {
      const projectDirs = await readdir(claudeProjectsPath, { withFileTypes: true });

      for (const dir of projectDirs) {
        if (dir.isDirectory()) {
          try {
            const dirPath = join(claudeProjectsPath, dir.name);
            const files = await readdir(dirPath);
            const jsonlFiles = files.filter((file) => file.endsWith(".jsonl"));

            for (const file of jsonlFiles) {
              try {
                const filePath = join(dirPath, file);
                const stats = await stat(filePath);

                // Skip files larger than 10MB to avoid memory issues
                const maxFileSize = 10 * 1024 * 1024; // 10MB
                if (stats.size > maxFileSize) {
                  console.log(`Skipping large file: ${filePath} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
                  continue;
                }

                allFiles.push({
                  filePath,
                  modifiedTime: stats.mtime,
                  size: stats.size,
                });
              } catch (err) {
                console.error(`Error getting stats for file ${file}:`, err);
              }
            }
          } catch (err) {
            console.error(`Error reading directory ${dir.name}:`, err);
          }
        }
      }
    } catch (err) {
      console.error("Error reading Claude projects directory:", err);
    }

    return allFiles;
  };

  const parseSessionFile = async (filePath: string): Promise<Session | null> => {
    try {
      const content = await readFile(filePath, "utf-8");
      const lines = content
        .trim()
        .split("\n")
        .filter((line) => line.trim())
        .slice(0, 500); // Only process first 500 lines to save memory

      if (lines.length === 0) return null;

      let sessionId = "";
      let directory = "";
      let description = "Claude Code Session";
      let timestamp = new Date();
      let lastActivity = new Date(0);
      let isErrorSession = false;

      // Parse JSONL entries
      for (const line of lines) {
        try {
          const entry: SessionEntry = JSON.parse(line);

          // Get basic session info from first entry
          if (sessionId === "" && entry.sessionId) {
            sessionId = entry.sessionId;
            directory = entry.cwd || "";
            timestamp = new Date(entry.timestamp);
          }

          // Update last activity
          if (entry.timestamp) {
            const entryTime = new Date(entry.timestamp);
            if (entryTime > lastActivity) {
              lastActivity = entryTime;
            }
          }

          // Look for summary entries or meaningful descriptions
          if (entry.type === "summary" && entry.summary) {
            description = entry.summary;
            // Check if this is an error session - expanded patterns
            if (
              entry.summary.includes("Invalid API key") ||
              entry.summary.includes("Please run /login") ||
              entry.summary.includes("authentication") ||
              entry.summary.includes("login") ||
              entry.summary.includes("API key")
            ) {
              isErrorSession = true;
            }
          } else if (entry.message?.content && description === "Claude Code Session") {
            // Use first user message as description if no summary
            const content = entry.message.content;
            if (typeof content === "string" && content.length > 0 && content.length < 200) {
              description = content.substring(0, 100) + (content.length > 100 ? "..." : "");
            }
          }
        } catch {
          // Skip malformed lines
          continue;
        }
      }

      // If no sessionId found in content, try to extract from filename
      if (!sessionId) {
        const filename = filePath.split("/").pop() || "";
        const match = filename.match(/([a-f0-9-]{36})\.jsonl$/);
        if (match) {
          sessionId = match[1];
          console.log(`📁 Extracted sessionId from filename: ${sessionId}`);
        }
      }

      // If still no sessionId, this file can't be parsed
      if (!sessionId) {
        console.log(`❌ No sessionId found in content or filename for: ${filePath.split("/").pop()}`);
        return null;
      }

      // For error sessions, provide better description and default directory
      if (isErrorSession) {
        // Provide more actionable error descriptions
        if (description.includes("Invalid API key") || description.includes("API key")) {
          description = "❌ Authentication failed - Invalid API key";
        } else if (description.includes("Please run /login") || description.includes("login")) {
          description = "❌ Authentication required - Run 'claude login'";
        } else if (description.includes("authentication")) {
          description = "❌ Authentication error - Check Claude setup";
        } else {
          description = "❌ " + description;
        }

        if (!directory) {
          directory = "~"; // Default directory for failed sessions
        }
      }

      // Set timestamp from file stats if not available from content
      if (!timestamp || timestamp.getTime() === 0) {
        try {
          const stats = await stat(filePath);
          timestamp = stats.mtime;
        } catch {
          timestamp = new Date();
        }
      }

      return {
        id: sessionId,
        description,
        directory: directory || "~",
        timestamp,
        lastActivity: lastActivity.getTime() > 0 ? lastActivity : timestamp,
        filePath,
        isErrorSession,
      };
    } catch (err) {
      console.error(`Error parsing session file ${filePath}:`, err);
      return null;
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const deleteSessionFile = async (session: Session): Promise<boolean> => {
    try {
      // Confirm deletion with user
      const confirmed = await confirmAlert({
        title: "Delete Session",
        message: `Are you sure you want to delete this session?\n\n"${session.description}"\n\nThis action cannot be undone.`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
          style: Alert.ActionStyle.Cancel,
        },
      });

      if (!confirmed) {
        return false;
      }

      // Delete the session file
      await unlink(session.filePath);

      // Show success toast
      await showToast({
        style: Toast.Style.Success,
        title: "Session Deleted",
        message: `Successfully deleted session: ${session.description.slice(0, 50)}${session.description.length > 50 ? "..." : ""}`,
      });

      // Refresh sessions list
      await loadSessions();

      return true;
    } catch (error) {
      console.error("Error deleting session file:", error);

      showFailureToast(error instanceof Error ? error : new Error("Failed to delete session file"), {
        title: "Delete Failed",
      });

      return false;
    }
  };

  const filteredSessions = sessions.filter((session) => {
    // Apply search filter only (error sessions already filtered out in loadSessions)
    if (!searchText) return true;
    const query = searchText.toLowerCase();
    return (
      session.description.toLowerCase().includes(query) ||
      session.directory.toLowerCase().includes(query) ||
      getProjectName(session.directory).toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return <List isLoading searchBarPlaceholder="Loading Claude Code sessions..." />;
  }

  if (error) {
    return (
      <List>
        <List.Item
          title="Error Loading Sessions"
          subtitle={error}
          icon={Icon.XMarkCircle}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={loadSessions} icon={Icon.RotateClockwise} />
              <Action.OpenInBrowser title="Install Claude Code" url="https://docs.anthropic.com/en/docs/claude-code" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (sessions.length === 0) {
    return (
      <List>
        <List.Item
          title="No Claude Code Sessions Found"
          subtitle="Start using Claude Code CLI to see your sessions here"
          icon={Icon.Message}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Learn About Claude Code"
                url="https://docs.anthropic.com/en/docs/claude-code"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={(text: string) => setSearchText(text || "")}
      searchBarPlaceholder="Search Claude Code sessions..."
      navigationTitle="Claude Code Sessions"
    >
      {filteredSessions.map((session) => (
        <List.Item
          key={session.id}
          title={session.description}
          subtitle={getProjectName(session.directory)}
          accessories={[{ text: formatTimeAgo(session.lastActivity) }]}
          icon={Icon.Message}
          actions={
            <ActionPanel>
              <ResumeSessionAction session={session} />
              <Action.Push
                title="View Project Sessions"
                target={
                  <ProjectSessions
                    projectDirectory={session.directory}
                    projectName={getProjectName(session.directory)}
                    encodedDirName={getEncodedDirName(session.filePath)}
                  />
                }
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action.CopyToClipboard
                title="Copy Claude Command"
                content={`cd "${session.directory}" && claude -r "${session.id}"`}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
              />
              <Action.CopyToClipboard
                title="Copy Session ID"
                content={session.id}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Directory Path"
                content={session.directory}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action
                title="Show Full Description"
                onAction={async () => {
                  try {
                    await showToast({
                      style: Toast.Style.Animated,
                      title: "Session Description",
                      message: session.description,
                    });
                  } catch (error) {
                    console.error("Error showing description toast:", error);
                  }
                }}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
              <Action
                title="Delete Session"
                onAction={() => deleteSessionFile(session)}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ResumeSessionAction({ session }: { session: Session }) {
  const resumeCommand = `cd "${session.directory}" && claude -r "${session.id}"`;

  return (
    <Action
      title="Resume Session"
      onAction={async () => {
        try {
          const result = await executeInTerminal(resumeCommand);

          if (result.success) {
            await showTerminalSuccessToast(
              result.terminalUsed,
              `Claude Code session in ${getProjectName(session.directory)}`,
            );
          } else {
            await showTerminalErrorToast(
              getManualCommand(resumeCommand),
              `Claude Code session in ${getProjectName(session.directory)}`,
            );
          }
        } catch (error) {
          console.error("Error resuming session:", error);
          showFailureToast(error instanceof Error ? error : new Error("Failed to resume session"), {
            title: "Resume Failed",
          });
        }
      }}
      icon={Icon.Play}
      shortcut={{ modifiers: [], key: "return" }}
    />
  );
}
