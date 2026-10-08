import { readdir, stat } from "fs/promises"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { homedir } from "os"
import { trash } from "@raycast/api"
import type { Session } from "../types"

export const HOME = homedir()
export const CLAUDE_PROJECTS = join(HOME, ".claude", "projects")
export const CLAUDE_JSON = join(HOME, ".claude.json")
export const CHATS_DIR = join(HOME, ".chats")

export const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

export const toProjectDirName = (absPath: string) =>
  absPath.replace(/[^a-zA-Z0-9]/g, "-")

const humanLabel = (dir: string) => {
  const base = dir.split("/").pop() || dir
  const words = base
    .replace(/^[._-]+/, "")
    .replace(/[-_]+/g, " ")
    .trim()
  return (words || base).replace(/\b\w/g, (c) => c.toUpperCase())
}

const kebabLabel = (dir: string) => dir.split("/").pop() || dir

const timeAgo = (mtime: number) => {
  const diff = Date.now() / 1000 - mtime
  const m = Math.floor(diff / 60)
  const h = Math.floor(diff / 3600)
  const d = Math.floor(diff / 86400)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m`
  if (h < 24) return `${h}h`
  if (d === 1) return "yesterday"
  if (d < 7) return `${d}d`
  return new Date(mtime * 1000).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  })
}

const removeFromClaudeJson = (dir: string) => {
  try {
    const json = JSON.parse(readFileSync(CLAUDE_JSON, "utf8"))
    if (json.projects?.[dir]) {
      delete json.projects[dir]
      writeFileSync(CLAUDE_JSON, JSON.stringify(json, null, 2))
    }
  } catch {
    // noop
  }
}

export const loadSessions = async (): Promise<Session[]> => {
  const sessions: Session[] = []

  if (existsSync(CLAUDE_JSON)) {
    try {
      const projectPaths = Object.keys(
        JSON.parse(readFileSync(CLAUDE_JSON, "utf8")).projects ?? {},
      )
      await Promise.all(
        projectPaths.map(async (cwd) => {
          try {
            const claudeProjectDir = join(
              CLAUDE_PROJECTS,
              toProjectDirName(cwd),
            )
            if (!existsSync(claudeProjectDir)) return
            const jsonlFiles = (await readdir(claudeProjectDir)).filter((f) =>
              f.endsWith(".jsonl"),
            )
            if (!jsonlFiles.length) return
            const mtime = Math.max(
              ...(await Promise.all(
                jsonlFiles.map((f) =>
                  stat(join(claudeProjectDir, f)).then((s) => s.mtimeMs / 1000),
                ),
              )),
            )
            const shortPath = cwd.replace(HOME, "~")
            const type =
              cwd === HOME || cwd.startsWith(CHATS_DIR) ? "chat" : "code"
            sessions.push({
              dir: cwd,
              label: type === "chat" ? humanLabel(cwd) : kebabLabel(cwd),
              path: shortPath,
              type,
              mtime,
              ago: timeAgo(mtime),
              claudeProjectDir,
            })
          } catch {
            // noop
          }
        }),
      )
    } catch {
      // noop
    }
  }

  const seen = new Set(sessions.map((s) => s.dir))
  if (existsSync(CHATS_DIR)) {
    try {
      for (const dir of await readdir(CHATS_DIR)) {
        try {
          const fullPath = join(CHATS_DIR, dir)
          if (!(await stat(fullPath)).isDirectory() || seen.has(fullPath))
            continue
          sessions.push({
            dir: fullPath,
            label: humanLabel(fullPath),
            path: fullPath.replace(HOME, "~"),
            type: "chat",
            mtime: 0,
            ago: "new",
            claudeProjectDir: "",
          })
        } catch {
          // noop
        }
      }
    } catch {
      // noop
    }
  }

  const unique = [...new Map(sessions.map((s) => [s.dir, s])).values()]
  return unique.sort((a, b) => b.mtime - a.mtime)
}

export const deleteSession = async (session: Session) => {
  if (session.claudeProjectDir) {
    await trash(session.claudeProjectDir)
    removeFromClaudeJson(session.dir)
  }
  if (session.type === "chat") {
    await trash(session.dir)
  }
}
