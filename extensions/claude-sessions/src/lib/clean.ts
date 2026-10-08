import { trash } from "@raycast/api"
import { readdir } from "fs/promises"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import {
  HOME,
  CLAUDE_PROJECTS,
  CLAUDE_JSON,
  toProjectDirName,
} from "./sessions"
import type { CleanItem } from "../types"

const removeFromClaudeJson = (cwd: string) => {
  try {
    const json = JSON.parse(readFileSync(CLAUDE_JSON, "utf8"))
    if (json.projects?.[cwd]) {
      delete json.projects[cwd]
      writeFileSync(CLAUDE_JSON, JSON.stringify(json, null, 2))
    }
  } catch {
    // noop
  }
}

export const findCleanItems = async (): Promise<CleanItem[]> => {
  const items: CleanItem[] = []
  if (!existsSync(CLAUDE_JSON)) return items

  let projects: Record<string, unknown> = {}
  try {
    projects = JSON.parse(readFileSync(CLAUDE_JSON, "utf8")).projects ?? {}
  } catch {
    return items
  }

  const projectPaths = Object.keys(projects)

  for (const cwd of projectPaths) {
    const projectDir = join(CLAUDE_PROJECTS, toProjectDirName(cwd))
    const shortCwd = cwd.replace(HOME, "~")

    if (!existsSync(cwd)) {
      items.push({
        label: shortCwd,
        reason: "ghost (directory deleted)",
        execute: async () => {
          removeFromClaudeJson(cwd)
          if (existsSync(projectDir)) await trash(projectDir)
        },
      })
      continue
    }

    if (!existsSync(projectDir)) {
      items.push({
        label: shortCwd,
        reason: "no history",
        execute: async () => {
          removeFromClaudeJson(cwd)
        },
      })
      continue
    }

    try {
      const jsonlFiles = (await readdir(projectDir)).filter((f) =>
        f.endsWith(".jsonl"),
      )
      if (!jsonlFiles.length) {
        items.push({
          label: shortCwd,
          reason: "no history",
          execute: async () => {
            removeFromClaudeJson(cwd)
            await trash(projectDir)
          },
        })
      }
    } catch {
      // noop
    }
  }

  if (existsSync(CLAUDE_PROJECTS)) {
    const knownDirNames = new Set(projectPaths.map(toProjectDirName))
    try {
      for (const dir of await readdir(CLAUDE_PROJECTS)) {
        if (!knownDirNames.has(dir)) {
          const fullPath = join(CLAUDE_PROJECTS, dir)
          items.push({
            label: `~/.claude/projects/${dir}`,
            reason: "orphaned history",
            execute: async () => {
              await trash(fullPath)
            },
          })
        }
      }
    } catch {
      // noop
    }
  }

  return items
}
