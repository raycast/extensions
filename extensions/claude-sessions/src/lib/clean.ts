import { readdir } from "fs/promises"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { execSync } from "child_process"
import {
  HOME,
  CLAUDE_PROJECTS,
  CLAUDE_JSON,
  toProjectDirName,
} from "./sessions"
import type { CleanItem } from "../types"

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
        execute: () => {
          try {
            const json = JSON.parse(readFileSync(CLAUDE_JSON, "utf8"))
            if (json.projects?.[cwd]) {
              delete json.projects[cwd]
              writeFileSync(CLAUDE_JSON, JSON.stringify(json, null, 2))
            }
          } catch {
            // noop
          }
          if (existsSync(projectDir)) {
            try {
              execSync(`trash "${projectDir}"`)
            } catch {
              // noop
            }
          }
        },
      })
      continue
    }

    if (!existsSync(projectDir)) {
      items.push({
        label: shortCwd,
        reason: "no history",
        execute: () => {
          try {
            const json = JSON.parse(readFileSync(CLAUDE_JSON, "utf8"))
            if (json.projects?.[cwd]) {
              delete json.projects[cwd]
              writeFileSync(CLAUDE_JSON, JSON.stringify(json, null, 2))
            }
          } catch {
            // noop
          }
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
          execute: () => {
            try {
              const json = JSON.parse(readFileSync(CLAUDE_JSON, "utf8"))
              if (json.projects?.[cwd]) {
                delete json.projects[cwd]
                writeFileSync(CLAUDE_JSON, JSON.stringify(json, null, 2))
              }
            } catch {
              // noop
            }
            try {
              execSync(`trash "${projectDir}"`)
            } catch {
              // noop
            }
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
            execute: () => {
              try {
                execSync(`trash "${fullPath}"`)
              } catch {
                // noop
              }
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
