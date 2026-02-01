export type AgentType =
  | "amp"
  | "antigravity"
  | "augment"
  | "claude-code"
  | "openclaw"
  | "cline"
  | "codebuddy"
  | "codex"
  | "command-code"
  | "continue"
  | "crush"
  | "cursor"
  | "droid"
  | "gemini-cli"
  | "github-copilot"
  | "goose"
  | "iflow-cli"
  | "junie"
  | "kilo"
  | "kimi-cli"
  | "kiro-cli"
  | "kode"
  | "mcpjam"
  | "mistral-vibe"
  | "mux"
  | "neovate"
  | "opencode"
  | "openhands"
  | "pi"
  | "qoder"
  | "qwen-code"
  | "roo"
  | "trae"
  | "trae-cn"
  | "windsurf"
  | "zencoder"
  | "openclaude"
  | "pochi"
  | "adal"

export interface AgentConfig {
  name: string
  displayName: string
  skillsDir: string
  globalSkillsDir: string | undefined
  detectInstalled: () => Promise<boolean>
}

export interface Skill {
  id: string
  name: string
  description: string
  owner?: string
  repo?: string
  installCount: number
  installCommand: string
  url: string
  repositoryUrl?: string
  tags: string[]
  source: "skills.sh" | "github"
}

export interface InstalledSkill {
  name: string
  description: string
  path: string
  canonicalPath: string
  scope: "project" | "global"
  agents: AgentType[]
  sourceUrl?: string
  installedAt?: string
  updatedAt?: string
  hasUpdate?: boolean
}

export interface SkillInstallState {
  status: "not_installed" | "installed" | "update_available"
  installedAgents: AgentType[]
  localHash?: string
  remoteHash?: string
}

export type InstallMode = "symlink" | "copy"

export interface InstallResult {
  success: boolean
  path: string
  canonicalPath?: string
  mode: InstallMode
  symlinkFailed?: boolean
  error?: string
}
