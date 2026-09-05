import fsp from "fs/promises";
import fs from "fs";
import path from "path";
import os from "os";

export interface Project {
  /** Folder name inside ~/.claude/projects (encoded path) */
  id: string;
  /** Folder holding the session .jsonl files */
  storageDir: string;
  /** Real project path, extracted from the cwd field of the sessions */
  cwd: string | null;
  name: string;
  sessionCount: number;
  lastActivity: Date | null;
  cwdExists: boolean;
}

export interface Session {
  id: string;
  file: string;
  modifiedAt: Date;
  /** Summary or first user message */
  preview: string | null;
}

export function claudeProjectsDir(): string {
  return path.join(os.homedir(), ".claude", "projects");
}

const CWD_REGEX = /"cwd"\s*:\s*"((?:[^"\\]|\\.)*)"/;

async function readHead(file: string, bytes: number): Promise<string> {
  const fd = await fsp.open(file, "r");
  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await fd.read(buffer, 0, bytes, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await fd.close();
  }
}

async function extractCwd(file: string): Promise<string | null> {
  const head = await readHead(file, 64 * 1024);
  const match = CWD_REGEX.exec(head);
  if (!match) return null;
  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return null;
  }
}

async function sessionFiles(
  storageDir: string,
): Promise<{ file: string; mtime: Date }[]> {
  const entries = await fsp.readdir(storageDir);
  const files: { file: string; mtime: Date }[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".jsonl")) continue;
    const full = path.join(storageDir, entry);
    try {
      const stat = await fsp.stat(full);
      files.push({ file: full, mtime: stat.mtime });
    } catch {
      // file removed while listing
    }
  }
  files.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  return files;
}

export async function loadProjects(): Promise<Project[]> {
  const root = claudeProjectsDir();
  let dirs: string[];
  try {
    dirs = (await fsp.readdir(root, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }

  const projects = await Promise.all(
    dirs.map(async (id): Promise<Project | null> => {
      const storageDir = path.join(root, id);
      const files = await sessionFiles(storageDir);
      if (files.length === 0) return null;

      let cwd: string | null = null;
      for (const { file } of files.slice(0, 3)) {
        cwd = await extractCwd(file);
        if (cwd) break;
      }

      return {
        id,
        storageDir,
        cwd,
        name: cwd ? path.basename(cwd) : id,
        sessionCount: files.length,
        lastActivity: files[0].mtime,
        cwdExists: cwd ? fs.existsSync(cwd) : false,
      };
    }),
  );

  return projects
    .filter((p): p is Project => p !== null)
    .sort(
      (a, b) =>
        (b.lastActivity?.getTime() ?? 0) - (a.lastActivity?.getTime() ?? 0),
    );
}

function firstUserText(head: string): string | null {
  for (const line of head.split("\n")) {
    if (!line.includes('"type":"user"') && !line.includes('"type": "user"'))
      continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type !== "user" || obj.isMeta) continue;
      const content = obj.message?.content;
      let text: string | null = null;
      if (typeof content === "string") {
        text = content;
      } else if (Array.isArray(content)) {
        const block = content.find(
          (b) => b?.type === "text" && typeof b.text === "string",
        );
        text = block?.text ?? null;
      }
      if (text && !text.startsWith("<") && text.trim().length > 0) {
        return text.trim().replace(/\s+/g, " ");
      }
    } catch {
      // line truncated by the head cut — skip it
    }
  }
  return null;
}

export async function loadSessions(project: Project): Promise<Session[]> {
  const files = await sessionFiles(project.storageDir);
  return Promise.all(
    files.map(async ({ file, mtime }): Promise<Session> => {
      let preview: string | null = null;
      try {
        const head = await readHead(file, 128 * 1024);
        const summary =
          /"type"\s*:\s*"summary"\s*,\s*"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(
            head,
          );
        preview = summary
          ? (JSON.parse(`"${summary[1]}"`) as string)
          : firstUserText(head);
      } catch {
        // unreadable session — show the id only
      }
      return {
        id: path.basename(file, ".jsonl"),
        file,
        modifiedAt: mtime,
        preview,
      };
    }),
  );
}
