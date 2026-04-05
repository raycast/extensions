import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  Skill,
  SkillStates,
  SkillInstallation,
  AgentType,
  AgentConfig,
  ProjectStates,
} from "./types";
import { getSkillState } from "./storage";
import { fuzzyMatchScore, loadProjects } from "./projects";

// ============================================================
// Utilities
// ============================================================

function hashStr(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex");
}

export function expandPath(p: string): string {
  if (p.startsWith("~/")) {
    return path.join(process.env.HOME || "", p.slice(2));
  }
  return p;
}

function getBaseName(fileName: string): string {
  if (fileName.endsWith(".instructions.md"))
    return fileName.replace(".instructions.md", "");
  return path.basename(fileName, path.extname(fileName));
}

function parseDescription(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const descMatch = content.match(/^description:\s*(.*)$/im);
    if (descMatch && descMatch[1]) {
      return descMatch[1].trim().replace(/^['"]|['"]$/g, "");
    }
    const lines = content.split("\n");
    for (const line of lines) {
      const t = line.trim();
      if (
        t &&
        !t.startsWith("#") &&
        !t.startsWith("---") &&
        !t.startsWith("description:") &&
        !t.startsWith("applyTo:")
      ) {
        return t.slice(0, 100) + (t.length > 100 ? "..." : "");
      }
    }
  } catch (e) {}
  return "";
}

function safeReaddir(dir: string) {
  try {
    if (fs.existsSync(dir)) return fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {}
  return [];
}

function isSymlink(filePath: string): boolean {
  try {
    return fs.lstatSync(filePath).isSymbolicLink();
  } catch {
    return false;
  }
}

// ============================================================
// Agent Registry (对齐 vercel-labs/skills agents.ts)
// ============================================================

export const AGENT_REGISTRY: AgentConfig[] = [
  // ---- Universal Agents: skillsDir = ".agents/skills" ----
  // 这些 Agent 原生读取 .agents/skills，无需额外分发
  {
    id: "antigravity",
    name: "Antigravity",
    skillsDir: ".agents/skills",
    globalSkillsDir: "~/.gemini/antigravity/skills",
    isUniversal: true,
    detectInstalled: () => fs.existsSync(expandPath("~/.gemini/antigravity")),
  },
  {
    id: "cursor",
    name: "Cursor",
    skillsDir: ".agents/skills",
    globalSkillsDir: "~/.cursor/skills",
    isUniversal: true,
    detectInstalled: () => fs.existsSync(expandPath("~/.cursor")),
  },
  {
    id: "codex",
    name: "Codex",
    skillsDir: ".agents/skills",
    globalSkillsDir: "~/.codex/skills",
    isUniversal: true,
    detectInstalled: () => fs.existsSync(expandPath("~/.codex")),
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    skillsDir: ".agents/skills",
    globalSkillsDir: "~/.copilot/skills",
    isUniversal: true,
    detectInstalled: () => fs.existsSync(expandPath("~/.copilot")),
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    skillsDir: ".agents/skills",
    globalSkillsDir: "~/.gemini/skills",
    isUniversal: true,
    detectInstalled: () => fs.existsSync(expandPath("~/.gemini")),
  },

  // ---- Non-Universal Agents: 需要 symlink 分发 ----
  {
    id: "claude-code",
    name: "Claude Code",
    skillsDir: ".claude/skills",
    globalSkillsDir: "~/.claude/skills",
    isUniversal: false,
    detectInstalled: () => fs.existsSync(expandPath("~/.claude")),
  },
  {
    id: "windsurf",
    name: "Windsurf",
    skillsDir: ".windsurf/skills",
    globalSkillsDir: "~/.codeium/windsurf/skills",
    isUniversal: false,
    detectInstalled: () => fs.existsSync(expandPath("~/.codeium/windsurf")),
  },
  {
    id: "roo-code",
    name: "Roo Code",
    skillsDir: ".roo/skills",
    globalSkillsDir: "~/.roo/skills",
    isUniversal: false,
    detectInstalled: () => fs.existsSync(expandPath("~/.roo")),
  },
];

/** 获取本机已安装的 Agent 列表 */
export function getInstalledAgents(): AgentConfig[] {
  return AGENT_REGISTRY.filter((a) => a.detectInstalled());
}

/** 获取本机已安装的 Non-Universal Agent 列表 */
export function getInstalledNonUniversalAgents(): AgentConfig[] {
  return AGENT_REGISTRY.filter((a) => !a.isUniversal && a.detectInstalled());
}

// ============================================================
// Skill Loader (扫描 + 聚合)
// ============================================================

export function loadSkills(
  globalDirPref: string,
  skillStates: SkillStates,
  projectStates: ProjectStates,
): Skill[] {
  const canonicalGlobalDir = expandPath(globalDirPref || "~/.agents/skills");
  const skillMap = new Map<string, Skill>();

  const getOrCreateSkill = (name: string, description: string): Skill => {
    const id = hashStr(name);
    if (!skillMap.has(id)) {
      const state = getSkillState(skillStates, id);
      skillMap.set(id, {
        id,
        name,
        description: description || "",
        installations: [],
        isPinned: state.isPinned,
        isFavorite: state.isFavorite,
        pinnedAt: state.pinnedAt,
        favoritedAt: state.favoritedAt,
        usageCount: state.usageCount,
        lastUsedAt: state.lastUsedAt,
      });
    } else if (description && !skillMap.get(id)!.description) {
      skillMap.get(id)!.description = description;
    }
    return skillMap.get(id)!;
  };

  // 1. 扫描全局 Canonical 目录 (~/.agents/skills)
  for (const item of safeReaddir(canonicalGlobalDir)) {
    if (item.name.startsWith(".")) continue;
    const fullPath = path.join(canonicalGlobalDir, item.name);

    // 跳过 symlink（它们是 Non-Universal Agent 用的镜像，不要重复计入）
    if (isSymlink(fullPath)) continue;

    let name = item.name;
    let desc = "";
    if (item.isDirectory()) {
      const mdPath = path.join(fullPath, "SKILL.md");
      if (fs.existsSync(mdPath)) desc = parseDescription(mdPath);
    } else {
      name = getBaseName(item.name);
      desc = parseDescription(fullPath);
    }
    const skill = getOrCreateSkill(name, desc);
    skill.installations.push({
      type: "global",
      agentType: "Global",
      filePath: fullPath,
      sourceGroupId: `global:${canonicalGlobalDir}`,
    });
  }

  // 2. 扫描各项目
  const projects = loadProjects(projectStates);
  for (const project of projects) {
    const pPath = project.path;
    const sourceGroup = `project:${pPath}`;

    // A. 主干目录：.agents/skills (Universal 共享)
    const masterDir = path.join(pPath, ".agents", "skills");
    for (const item of safeReaddir(masterDir)) {
      if (item.name.startsWith(".")) continue;
      const fullPath = path.join(masterDir, item.name);
      const name = item.isDirectory() ? item.name : getBaseName(item.name);
      let desc = "";
      if (
        item.isDirectory() &&
        fs.existsSync(path.join(fullPath, "SKILL.md"))
      ) {
        desc = parseDescription(path.join(fullPath, "SKILL.md"));
      } else if (item.isFile?.()) {
        desc = parseDescription(fullPath);
      }
      const skill = getOrCreateSkill(name, desc);
      skill.installations.push({
        type: "project",
        projectPath: pPath,
        projectName: project.name,
        agentType: "Antigravity",
        filePath: fullPath,
        sourceGroupId: sourceGroup,
        isSymlink: false,
      });
    }

    // B. 扫描 Non-Universal Agent 目录，仅记录 symlink 健康状态
    for (const agent of getInstalledNonUniversalAgents()) {
      const agentDir = path.join(pPath, agent.skillsDir);
      for (const item of safeReaddir(agentDir)) {
        if (item.name.startsWith(".")) continue;
        const fullPath = path.join(agentDir, item.name);
        const isSym = isSymlink(fullPath);

        // 如果是 symlink 指向主干，记录但不重复创建 skill
        const name = item.isDirectory() ? item.name : getBaseName(item.name);
        const skill = getOrCreateSkill(name, "");

        // 避免已经记录了主干的 installation 再重复
        const alreadyHasMaster = skill.installations.some(
          (i) => i.projectPath === pPath && i.agentType === "Antigravity",
        );

        skill.installations.push({
          type: "project",
          projectPath: pPath,
          projectName: project.name,
          agentType: agent.name,
          filePath: fullPath,
          sourceGroupId: sourceGroup,
          isSymlink: isSym,
        });
      }
    }
  }

  return Array.from(skillMap.values());
}

// ============================================================
// Installation Engine (Symlink 架构)
// ============================================================

/**
 * 安装 Skill 到项目 — 对齐 vercel-labs/skills 的 Symlink 分发
 *
 * 1. 将 skill 实体写入项目的 .agents/skills/ (Master)
 * 2. 对每个已安装的 Non-Universal Agent，创建 symlink 指向 Master
 */
export async function installSkillToProject(
  skill: Skill,
  targetProjectPath: string,
): Promise<{ master: string; symlinked: string[]; copied: string[] }> {
  // 找到源文件（优先全局主干，否则第一个可用的安装）
  const source =
    skill.installations.find((i) => i.type === "global") ||
    skill.installations[0];
  if (!source) throw new Error("No source file found for skill");

  const srcPath = source.filePath;
  const skillName = skill.name;

  // 1. 写入 Master: .agents/skills/
  const masterDest = path.join(
    targetProjectPath,
    ".agents",
    "skills",
    skillName,
  );
  const masterDir = path.dirname(masterDest);
  if (!fs.existsSync(masterDir)) fs.mkdirSync(masterDir, { recursive: true });

  // 只有当源和目标不同路径时才 copy
  if (path.resolve(srcPath) !== path.resolve(masterDest)) {
    if (fs.existsSync(masterDest))
      fs.rmSync(masterDest, { recursive: true, force: true });
    if (fs.statSync(srcPath).isDirectory()) {
      fs.cpSync(srcPath, masterDest, { recursive: true });
    } else {
      fs.copyFileSync(srcPath, masterDest);
    }
  }

  // 2. 为每个已安装的 Non-Universal Agent 创建 symlink
  const symlinked: string[] = [];
  const copied: string[] = [];

  for (const agent of getInstalledNonUniversalAgents()) {
    const linkPath = path.join(targetProjectPath, agent.skillsDir, skillName);
    const linkDir = path.dirname(linkPath);

    if (!fs.existsSync(linkDir)) fs.mkdirSync(linkDir, { recursive: true });
    if (fs.existsSync(linkPath))
      fs.rmSync(linkPath, { recursive: true, force: true });

    // 计算相对路径
    const relTarget = path.relative(linkDir, masterDest);

    try {
      fs.symlinkSync(relTarget, linkPath);
      symlinked.push(agent.name);
    } catch {
      // fallback: copy
      if (fs.statSync(masterDest).isDirectory()) {
        fs.cpSync(masterDest, linkPath, { recursive: true });
      } else {
        fs.copyFileSync(masterDest, linkPath);
      }
      copied.push(agent.name);
    }
  }

  return { master: masterDest, symlinked, copied };
}

/**
 * 智能选择可用的源文件（优先 Antigravity 主干，然后全局，最后 fallback）
 */
function findBestSource(skill: Skill): string {
  // 1. 项目里的 Antigravity 主干（最可靠）
  const master = skill.installations.find(
    (i) => i.agentType === "Antigravity" && i.type === "project",
  );
  if (master && fs.existsSync(master.filePath)) return master.filePath;
  // 2. 全局安装
  const global = skill.installations.find((i) => i.type === "global");
  if (global && fs.existsSync(global.filePath)) return global.filePath;
  // 3. 任意可用的
  for (const ins of skill.installations) {
    if (fs.existsSync(ins.filePath)) return ins.filePath;
  }
  throw new Error(`No valid source file found for skill "${skill.name}"`);
}

/**
 * 同步 Skill 到全局 Canonical 目录 (~/.agents/skills)
 */
export async function syncSkillToGlobal(skill: Skill, globalDir: string) {
  const srcPath = findBestSource(skill);
  const destPath = path.join(expandPath(globalDir), skill.name);
  const destDir = path.dirname(destPath);

  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  if (path.resolve(srcPath) === path.resolve(destPath)) return; // 已经在全局了
  if (fs.existsSync(destPath))
    fs.rmSync(destPath, { recursive: true, force: true });

  if (fs.statSync(srcPath).isDirectory()) {
    fs.cpSync(srcPath, destPath, { recursive: true });
  } else {
    fs.copyFileSync(srcPath, destPath);
  }
}

/**
 * 同步 Skill 到某个 Non-Universal Agent 的全局目录（创建 symlink）
 */
export async function syncSkillToAgentGlobal(
  skill: Skill,
  agent: AgentConfig,
  canonicalGlobalDir: string,
): Promise<"symlinked" | "copied"> {
  // 确保 Canonical 全局仓库里有这个 skill
  const canonicalPath = path.join(expandPath(canonicalGlobalDir), skill.name);
  if (!fs.existsSync(canonicalPath)) {
    await syncSkillToGlobal(skill, canonicalGlobalDir);
  }

  const agentGlobalDir = expandPath(agent.globalSkillsDir);
  const linkPath = path.join(agentGlobalDir, skill.name);

  if (!fs.existsSync(agentGlobalDir))
    fs.mkdirSync(agentGlobalDir, { recursive: true });
  if (fs.existsSync(linkPath))
    fs.rmSync(linkPath, { recursive: true, force: true });

  const relTarget = path.relative(agentGlobalDir, canonicalPath);

  try {
    fs.symlinkSync(relTarget, linkPath);
    return "symlinked";
  } catch {
    fs.cpSync(canonicalPath, linkPath, { recursive: true });
    return "copied";
  }
}

// ============================================================
// Backup Engine
// ============================================================

/**
 * 检查某个 skill 是否已在备份目录中存在
 */
export function isSkillBackedUp(skillName: string, backupDir: string): boolean {
  if (!backupDir) return false;
  const backupPath = path.join(expandPath(backupDir), skillName);
  return fs.existsSync(backupPath);
}

/**
 * 备份单个 skill 到备份目录（物理拷贝）
 */
export async function backupSkill(skill: Skill, backupDir: string) {
  if (!backupDir) return;
  const srcPath = findBestSource(skill);
  const dest = path.join(expandPath(backupDir), skill.name);
  const destDir = path.dirname(dest);

  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });

  if (fs.statSync(srcPath).isDirectory()) {
    fs.cpSync(srcPath, dest, { recursive: true });
  } else {
    fs.copyFileSync(srcPath, dest);
  }
}

/**
 * 批量备份所有 skill 到备份目录
 */
export async function backupAllSkills(
  skills: Skill[],
  backupDir: string,
): Promise<number> {
  if (!backupDir) return 0;
  let count = 0;
  for (const skill of skills) {
    try {
      await backupSkill(skill, backupDir);
      count++;
    } catch {
      // skip failed ones
    }
  }
  return count;
}

// ============================================================
// Sorting
// ============================================================

export function sortSkills(skills: Skill[], hasSearchText: boolean) {
  const pinned: Skill[] = [];
  const favorited: Skill[] = [];
  const normal: Skill[] = [];

  const sortedBase = hasSearchText
    ? skills
    : [...skills].sort((a, b) => {
        const usageA = a.usageCount || 0;
        const usageB = b.usageCount || 0;
        if (usageA !== usageB) return usageB - usageA;
        return a.name.localeCompare(b.name);
      });

  for (const skill of sortedBase) {
    if (skill.isPinned) pinned.push(skill);
    else if (skill.isFavorite) favorited.push(skill);
    else normal.push(skill);
  }

  if (!hasSearchText) {
    pinned.sort((a, b) => (b.pinnedAt || 0) - (a.pinnedAt || 0));
    favorited.sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0));
  }

  return { pinned, favorited, normal };
}

export { fuzzyMatchScore };
