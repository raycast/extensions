import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";
import { Project, ProjectsConfig, Session } from "../types";

const GEMINI_DIR = path.join(os.homedir(), ".gemini");
const PROJECTS_JSON_PATH = path.join(GEMINI_DIR, "projects.json");
const TMP_DIR = path.join(GEMINI_DIR, "tmp");

export async function getProjects(): Promise<Project[]> {
  try {
    if (!fs.existsSync(PROJECTS_JSON_PATH)) {
      return [];
    }

    const projectsData = await fs.promises.readFile(PROJECTS_JSON_PATH, "utf-8");
    const projectsConfig = JSON.parse(projectsData) as ProjectsConfig;

    return Object.entries(projectsConfig.projects).map(([projectPath, id]) => ({
      id,
      path: projectPath,
      name: path.basename(projectPath),
    }));
  } catch (error) {
    console.error("Error reading projects:", error);
    return [];
  }
}

// Extract essential metadata using regex to avoid loading the entire JSON into memory
// This prevents "JS heap out of memory" errors for extremely large session files.
async function extractSessionMetadata(
  filePath: string,
): Promise<{ id: string | null; startTime: string; lastUpdated: string; title: string; messageCount: number } | null> {
  return new Promise((resolve) => {
    let title = "Empty Session";
    let id: string | null = null;
    let startTime = new Date().toISOString();
    let lastUpdated = new Date().toISOString();
    let messageCount = 0;

    let foundMessagesArray = false;
    let foundUser = false;
    let inContent = false;

    // Safety timeout in case parsing takes too long (1 second per file max)
    const timeout = setTimeout(() => {
      readStream.destroy();
      resolve(null);
    }, 1000);

    const readStream = fs.createReadStream(filePath, { encoding: "utf8" });
    const rl = readline.createInterface({
      input: readStream,
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      // Fast matching for simple scalar fields at the top of the file
      if (!id && line.includes('"sessionId":')) {
        const match = line.match(/"sessionId":\s*"(.*?)"/);
        if (match) id = match[1];
      }

      if (line.includes('"startTime":')) {
        const match = line.match(/"startTime":\s*"(.*?)"/);
        if (match) startTime = match[1];
      }

      if (line.includes('"lastUpdated":')) {
        const match = line.match(/"lastUpdated":\s*"(.*?)"/);
        if (match) lastUpdated = match[1];
      }

      if (line.includes('"type": "user"') || line.includes('"type": "gemini"')) {
        messageCount++;
      }

      // Title extraction logic (only capture the very first user message)
      if (title === "Empty Session") {
        if (line.includes('"messages": [')) foundMessagesArray = true;

        if (foundMessagesArray) {
          if (line.includes('"type": "user"')) foundUser = true;

          if (foundUser && line.includes('"content": [')) {
            inContent = true;
          }

          if (inContent && line.includes('"text": "')) {
            // Updated regex to safely handle escaped JSON sequences like \"
            const match = line.match(/"text":\s*"((?:[^"\\]|\\.)*)"/);
            if (match) {
              // Extract text and stop looking for title
              title = match[1];
              // Reset flags so we don't accidentally overwrite the title
              foundUser = false;
              inContent = false;
            }
          }
        }
      }
    });

    rl.on("close", () => {
      clearTimeout(timeout);
      // Unescape JSON stringified characters (like \n, \", etc) safely
      try {
        title = JSON.parse(`"${title}"`);
      } catch {
        // ignore
      }
      resolve({ id, startTime, lastUpdated, title, messageCount });
    });

    readStream.on("error", () => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

export async function getSessions(projects: Project[]): Promise<Session[]> {
  const sessions: Session[] = [];

  for (const project of projects) {
    const chatsDir = path.join(TMP_DIR, project.id, "chats");

    if (!fs.existsSync(chatsDir)) {
      continue;
    }

    try {
      const files = await fs.promises.readdir(chatsDir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      const results = await Promise.all(
        jsonFiles.map(async (file) => {
          const filePath = path.join(chatsDir, file);
          const metadata = await extractSessionMetadata(filePath);
          if (!metadata) return null;

          return {
            id: metadata.id || file.replace("session-", "").replace(".json", ""), // Fallback ID if JSON parsing skips sessionId
            projectId: project.id,
            projectName: project.name,
            projectPath: project.path,
            startTime: metadata.startTime,
            lastUpdated: metadata.lastUpdated,
            messageCount: metadata.messageCount,
            title: metadata.title,
            filePath,
          };
        }),
      );

      for (const session of results) {
        if (session) sessions.push(session);
      }
    } catch (error) {
      console.error(`Error reading chats directory ${chatsDir}:`, error);
    }
  }

  // Sort descending by lastUpdated
  return sessions.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
}
