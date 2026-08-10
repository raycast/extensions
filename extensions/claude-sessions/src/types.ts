export type Session = {
  dir: string
  label: string
  path: string
  type: "chat" | "code"
  mtime: number
  ago: string
  claudeProjectDir: string
}

export type CleanItem = {
  label: string
  reason: "ghost (directory deleted)" | "no history" | "orphaned history"
  execute: () => Promise<void>
}
