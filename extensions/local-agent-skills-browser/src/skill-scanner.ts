import fs from "fs";
import path from "path";
import os from "os";
import { Color } from "@raycast/api";
import { AgentDef, AgentInfo, Skill } from "./types";
import { parseSkillMd, listSupplementaryFiles } from "./utils";

const home = os.homedir();
const configHome = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
const claudeHome = process.env.CLAUDE_CONFIG_DIR || path.join(home, ".claude");
const codexHome = process.env.CODEX_HOME || path.join(home, ".codex");

const UNIVERSAL_SKILLS_DIR = path.join(home, ".agents", "skills");

const ALL_AGENTS: AgentDef[] = [
  // Universal agents (local skillsDir = .agents/skills)
  {
    id: "amp",
    displayName: "Amp",
    globalSkillsDir: path.join(configHome, "agents", "skills"),
    isUniversal: true,
  },
  {
    id: "codex",
    displayName: "Codex",
    globalSkillsDir: path.join(codexHome, "skills"),
    isUniversal: true,
    systemSubdirs: [".system"],
  },
  {
    id: "gemini-cli",
    displayName: "Gemini CLI",
    globalSkillsDir: path.join(home, ".gemini", "skills"),
    isUniversal: true,
  },
  {
    id: "github-copilot",
    displayName: "GitHub Copilot",
    globalSkillsDir: path.join(home, ".copilot", "skills"),
    isUniversal: true,
  },
  {
    id: "kimi-cli",
    displayName: "Kimi Code CLI",
    globalSkillsDir: path.join(configHome, "agents", "skills"),
    isUniversal: true,
  },
  {
    id: "opencode",
    displayName: "OpenCode",
    globalSkillsDir: path.join(configHome, "opencode", "skills"),
    isUniversal: true,
  },
  {
    id: "replit",
    displayName: "Replit",
    globalSkillsDir: path.join(configHome, "agents", "skills"),
    isUniversal: true,
  },

  // Non-universal agents (each has its own skills directory)
  {
    id: "adal",
    displayName: "AdaL",
    globalSkillsDir: path.join(home, ".adal", "skills"),
    isUniversal: false,
  },
  {
    id: "antigravity",
    displayName: "Antigravity",
    globalSkillsDir: path.join(home, ".gemini", "antigravity", "skills"),
    isUniversal: false,
  },
  {
    id: "augment",
    displayName: "Augment",
    globalSkillsDir: path.join(home, ".augment", "skills"),
    isUniversal: false,
  },
  {
    id: "claude-code",
    displayName: "Claude Code",
    globalSkillsDir: path.join(claudeHome, "skills"),
    isUniversal: false,
  },
  {
    id: "cline",
    displayName: "Cline",
    globalSkillsDir: path.join(home, ".cline", "skills"),
    isUniversal: false,
  },
  {
    id: "codebuddy",
    displayName: "CodeBuddy",
    globalSkillsDir: path.join(home, ".codebuddy", "skills"),
    isUniversal: false,
  },
  {
    id: "command-code",
    displayName: "Command Code",
    globalSkillsDir: path.join(home, ".commandcode", "skills"),
    isUniversal: false,
  },
  {
    id: "continue",
    displayName: "Continue",
    globalSkillsDir: path.join(home, ".continue", "skills"),
    isUniversal: false,
  },
  {
    id: "crush",
    displayName: "Crush",
    globalSkillsDir: path.join(configHome, "crush", "skills"),
    isUniversal: false,
  },
  {
    id: "cursor",
    displayName: "Cursor",
    globalSkillsDir: path.join(home, ".cursor", "skills"),
    isUniversal: false,
  },
  {
    id: "droid",
    displayName: "Droid",
    globalSkillsDir: path.join(home, ".factory", "skills"),
    isUniversal: false,
  },
  {
    id: "goose",
    displayName: "Goose",
    globalSkillsDir: path.join(configHome, "goose", "skills"),
    isUniversal: false,
  },
  {
    id: "iflow-cli",
    displayName: "iFlow CLI",
    globalSkillsDir: path.join(home, ".iflow", "skills"),
    isUniversal: false,
  },
  {
    id: "junie",
    displayName: "Junie",
    globalSkillsDir: path.join(home, ".junie", "skills"),
    isUniversal: false,
  },
  {
    id: "kilo",
    displayName: "Kilo Code",
    globalSkillsDir: path.join(home, ".kilocode", "skills"),
    isUniversal: false,
  },
  {
    id: "kiro-cli",
    displayName: "Kiro CLI",
    globalSkillsDir: path.join(home, ".kiro", "skills"),
    isUniversal: false,
  },
  {
    id: "kode",
    displayName: "Kode",
    globalSkillsDir: path.join(home, ".kode", "skills"),
    isUniversal: false,
  },
  {
    id: "mcpjam",
    displayName: "MCPJam",
    globalSkillsDir: path.join(home, ".mcpjam", "skills"),
    isUniversal: false,
  },
  {
    id: "mistral-vibe",
    displayName: "Mistral Vibe",
    globalSkillsDir: path.join(home, ".vibe", "skills"),
    isUniversal: false,
  },
  {
    id: "mux",
    displayName: "Mux",
    globalSkillsDir: path.join(home, ".mux", "skills"),
    isUniversal: false,
  },
  {
    id: "neovate",
    displayName: "Neovate",
    globalSkillsDir: path.join(home, ".neovate", "skills"),
    isUniversal: false,
  },
  {
    id: "openclaw",
    displayName: "OpenClaw",
    globalSkillsDir: path.join(home, ".openclaw", "skills"),
    isUniversal: false,
  },
  {
    id: "openhands",
    displayName: "OpenHands",
    globalSkillsDir: path.join(home, ".openhands", "skills"),
    isUniversal: false,
  },
  {
    id: "pi",
    displayName: "Pi",
    globalSkillsDir: path.join(home, ".pi", "agent", "skills"),
    isUniversal: false,
  },
  {
    id: "pochi",
    displayName: "Pochi",
    globalSkillsDir: path.join(home, ".pochi", "skills"),
    isUniversal: false,
  },
  {
    id: "qoder",
    displayName: "Qoder",
    globalSkillsDir: path.join(home, ".qoder", "skills"),
    isUniversal: false,
  },
  {
    id: "qwen-code",
    displayName: "Qwen Code",
    globalSkillsDir: path.join(home, ".qwen", "skills"),
    isUniversal: false,
  },
  {
    id: "roo",
    displayName: "Roo Code",
    globalSkillsDir: path.join(home, ".roo", "skills"),
    isUniversal: false,
  },
  {
    id: "trae",
    displayName: "Trae",
    globalSkillsDir: path.join(home, ".trae", "skills"),
    isUniversal: false,
  },
  {
    id: "trae-cn",
    displayName: "Trae CN",
    globalSkillsDir: path.join(home, ".trae-cn", "skills"),
    isUniversal: false,
  },
  {
    id: "windsurf",
    displayName: "Windsurf",
    globalSkillsDir: path.join(home, ".codeium", "windsurf", "skills"),
    isUniversal: false,
  },
  {
    id: "zencoder",
    displayName: "Zencoder",
    globalSkillsDir: path.join(home, ".zencoder", "skills"),
    isUniversal: false,
  },
];

// ---------------------------------------------------------------------------
// Agent colors — major agents get dedicated colors, rest are hashed
// ---------------------------------------------------------------------------

const AGENT_COLOR_MAP: Record<string, Color> = {
  "claude-code": Color.Purple,
  cursor: Color.Blue,
  codex: Color.Green,
  "github-copilot": Color.Orange,
  windsurf: Color.Magenta,
  "gemini-cli": Color.Yellow,
  cline: Color.Red,
  continue: Color.Blue,
  roo: Color.Orange,
  "kiro-cli": Color.Yellow,
};

const COLOR_PALETTE = [
  Color.Blue,
  Color.Green,
  Color.Magenta,
  Color.Orange,
  Color.Purple,
  Color.Red,
  Color.Yellow,
];

function agentColor(id: string): Color {
  if (id in AGENT_COLOR_MAP) return AGENT_COLOR_MAP[id];
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}

function toAgentInfo(agent: AgentDef): AgentInfo {
  return {
    id: agent.id,
    displayName: agent.displayName,
    color: agentColor(agent.id),
  };
}

// ---------------------------------------------------------------------------
// Directory scanning
// ---------------------------------------------------------------------------

function scanDirectory(
  dirPath: string,
  agent: AgentDef | null,
  isSystem: boolean,
  skillMap: Map<string, Skill>,
) {
  let entries: string[];
  try {
    entries = fs.readdirSync(dirPath);
  } catch {
    return;
  }

  for (const name of entries) {
    if (name.startsWith(".")) continue;

    const entryPath = path.join(dirPath, name);
    if (!fs.existsSync(path.join(entryPath, "SKILL.md"))) continue;

    let realPath: string;
    try {
      realPath = fs.realpathSync(entryPath);
    } catch {
      continue; // broken symlink
    }

    const existing = skillMap.get(realPath);
    if (existing) {
      if (agent && !existing.agents.some((a) => a.id === agent.id)) {
        existing.agents.push(toAgentInfo(agent));
      }
      continue;
    }

    const parsed = parseSkillMd(path.join(realPath, "SKILL.md"));
    if (!parsed) continue;

    skillMap.set(realPath, {
      name: parsed.frontmatter.name,
      description: parsed.frontmatter.description,
      realPath,
      skillMdPath: path.join(realPath, "SKILL.md"),
      markdownContent: parsed.body,
      agents: agent ? [toAgentInfo(agent)] : [],
      isUniversal: false, // determined after all scanning
      isSystem,
      supplementaryFiles: listSupplementaryFiles(realPath),
    });
  }
}

// ---------------------------------------------------------------------------
// Main scan
// ---------------------------------------------------------------------------

export function scanAllSkills(): Skill[] {
  const skillMap = new Map<string, Skill>();

  // 1. Scan the canonical universal skills directory first
  scanDirectory(UNIVERSAL_SKILLS_DIR, null, false, skillMap);

  // 2. Scan each agent's global skills directory
  for (const agent of ALL_AGENTS) {
    scanDirectory(agent.globalSkillsDir, agent, false, skillMap);

    // Scan system subdirectories (e.g. Codex .system/)
    if (agent.systemSubdirs) {
      for (const sub of agent.systemSubdirs) {
        scanDirectory(
          path.join(agent.globalSkillsDir, sub),
          agent,
          true,
          skillMap,
        );
      }
    }
  }

  // 3. Mark skills as universal based on where their realPath lives
  const universalPrefix = UNIVERSAL_SKILLS_DIR + path.sep;
  for (const skill of skillMap.values()) {
    skill.isUniversal = skill.realPath.startsWith(universalPrefix);
  }

  // 4. Deduplicate by skill name — the skills CLI can copy (not symlink)
  //    identical skills into multiple agent dirs, giving different realpaths.
  //    Merge agents and prefer the universal copy as canonical.
  const byName = new Map<string, Skill>();
  for (const skill of skillMap.values()) {
    const existing = byName.get(skill.name);
    if (!existing) {
      byName.set(skill.name, skill);
      continue;
    }

    for (const a of skill.agents) {
      if (!existing.agents.some((e) => e.id === a.id)) {
        existing.agents.push(a);
      }
    }
    existing.isSystem = existing.isSystem || skill.isSystem;

    // Prefer the universal copy as the canonical entry
    if (skill.isUniversal && !existing.isUniversal) {
      skill.agents = existing.agents;
      skill.isSystem = existing.isSystem;
      byName.set(skill.name, skill);
    }
  }

  return Array.from(byName.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
