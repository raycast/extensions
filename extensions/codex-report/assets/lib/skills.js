import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { namedFiles } from "./files.js";
import { increment } from "./utils.js";
import { sortedEntries } from "./format.js";

const SKILL_MD = "SKILL.md";
const SKILL_READ_COMMAND_RE = /(^|[;&|]\s*|["']\s*)\s*(?:[^\s"';&|]+[\\/])?(sed|cat|nl|wc|awk|head|tail)\b/;
const SKILL_PATH_RE = /((?:~[\\/]|[A-Za-z]:[\\/]|\/)[^\n\r'"`]*?[\\/]SKILL\.md)/g;
export function parseSkillName(content, fallback) {
  const match = /^name:\s*["']?([^"'\n]+)["']?\s*$/m.exec(content);
  return match?.[1]?.trim() || fallback;
}


function insidePath(value, root) {
  return value === root || value.startsWith(`${root}${path.sep}`);
}

function pluginSkillInfo(parts, name) {
  const cacheIndex = parts.lastIndexOf("cache");
  const skillsIndex = parts.lastIndexOf("skills");
  if (cacheIndex < 0 || skillsIndex <= cacheIndex || parts[cacheIndex - 1] !== "plugins") return null;
  const pluginName = parts[cacheIndex + 2] || "app";
  return { name: name.includes(":") ? name : `${pluginName}:${name}`, scope: "app" };
}

function localSkillScope(normalized) {
  const home = os.homedir();
  const codex = process.env.CODEX_HOME || path.join(home, ".codex");
  const claude = process.env.CLAUDE_CONFIG_DIR || path.join(home, ".claude");
  const roots = [path.join(codex, "skills"), path.join(claude, "skills"), path.join(home, ".agents", "skills")];
  if (roots.some((root) => insidePath(normalized, root))) return "personal";
  const repoRoots = [".agents", ".claude"];
  if (repoRoots.some((directory) => normalized.includes(`${path.sep}${directory}${path.sep}skills${path.sep}`))) return "repo";
  return "unknown";
}

export function skillInfoForPath(skillPath, content = "") {
  const normalized = path.normalize(skillPath);
  const name = parseSkillName(content, path.basename(path.dirname(normalized)));
  const codex = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  if (insidePath(normalized, path.join(codex, "skills", ".system"))) return { name, scope: "system", path: normalized };
  const plugin = pluginSkillInfo(normalized.split(path.sep), name);
  if (plugin) return { ...plugin, path: normalized };
  return { name, scope: localSkillScope(normalized), path: normalized };
}

export async function discoverSkills(scope, adapters, projectDirectories = []) {
  const roots = [...new Set([
    ...adapters.flatMap((adapter) => adapter.skillRoots),
    path.join(os.homedir(), ".agents", "skills"),
    ...projectDirectories.flatMap((cwd) => adapters.flatMap((adapter) => adapter.projectSkillRoots.map((dir) => path.join(cwd, dir)))),
    ...(scope.type === "folder" ? adapters.flatMap((adapter) => adapter.projectSkillRoots.map((dir) => path.join(scope.root, dir))) : []),
  ])];

  const byPath = new Map();
  const byName = new Map();

  for (const root of roots) {
    for (const skillPath of await namedFiles(root, SKILL_MD)) {
      let content = "";
      try {
        content = await fs.promises.readFile(skillPath, "utf8");
      } catch {
        // Keep the fallback folder-name metadata when a skill file cannot be read.
      }
      const info = skillInfoForPath(skillPath, content);
      byPath.set(info.path, info);
      if (!byName.has(info.name)) {
        byName.set(info.name, { ...info, paths: [] });
      }
      byName.get(info.name).paths.push(info.path);
    }
  }

  return { byPath, byName };
}

export function emptySkillEvidence() {
  return {
    reads: new Map(),
    mentions: new Map(),
    names: new Map(),
    scopes: new Map(),
  };
}

export function skillEvidenceKey(info) {
  return `${info.scope}\0${info.name}`;
}

export function normalizeSkillPath(value) {
  const withoutTrailingPunctuation = String(value).replace(/[),.;:]+$/, "");
  const expanded = withoutTrailingPunctuation.startsWith("~/")
    ? path.join(os.homedir(), withoutTrailingPunctuation.slice(2))
    : withoutTrailingPunctuation;
  return path.normalize(expanded);
}

export function parseFunctionArguments(value) {
  if (typeof value !== "string") {
    return value && typeof value === "object" ? value : {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function skillReadPathsFromCommand(command) {
  if (!command || !SKILL_READ_COMMAND_RE.test(command)) {
    return [];
  }

  return [...String(command).matchAll(SKILL_PATH_RE)]
    .map((match) => normalizeSkillPath(match[1]));
}

export function recordSkillRead(evidence, skillRegistry, skillPath, count = 1) {
  const info = skillRegistry?.byPath.get(skillPath) ?? skillInfoForPath(skillPath);
  const key = skillEvidenceKey(info);
  increment(evidence.reads, key, count);
  evidence.names.set(key, info.name);
  evidence.scopes.set(key, info.scope);
}

export function emptyRawSkillEvidence() {
  return {
    reads: new Map(),
    mentions: new Map(),
  };
}

export function recordRawSkillMentions(evidence, message) {
  const mentioned = new Set();
  for (const match of String(message ?? "").matchAll(/\$([A-Za-z0-9][A-Za-z0-9:_-]*)/g)) {
    mentioned.add(match[1]);
  }
  for (const name of mentioned) {
    increment(evidence.mentions, name);
  }
}


function mergeEvidenceLabels(target, source) {
  for (const [key, name] of source.names ?? []) {
    if (!target.names.has(key)) target.names.set(key, name);
  }
  for (const [key, scope] of source.scopes ?? []) {
    if (!target.scopes.has(key) || target.scopes.get(key) === "unknown") target.scopes.set(key, scope);
  }
}

export function mergeSkillEvidence(target, source) {
  for (const field of ["reads", "mentions"]) {
    for (const [key, count] of source[field] ?? []) increment(target[field], key, count);
  }
  mergeEvidenceLabels(target, source);
}

function skillScopeSummary(activeSkills, evidenceNames) {
  const scopes = new Map();
  for (const skill of activeSkills) {
    if (!scopes.has(skill.scope)) scopes.set(skill.scope, { active: 0, evidence: 0 });
    const row = scopes.get(skill.scope);
    row.active += 1;
    if (evidenceNames.has(skill.name)) row.evidence += 1;
  }
  return scopes;
}

export function aggregateSkills(sessions, skillRegistry) {
  const evidence = emptySkillEvidence();
  const readSessions = new Map();
  const mentionSessions = new Map();

  for (const session of sessions) {
    mergeSkillEvidence(evidence, session.skillEvidence ?? emptySkillEvidence());
    for (const key of session.skillEvidence?.reads?.keys() ?? []) {
      increment(readSessions, key);
    }
    for (const name of session.skillEvidence?.mentions?.keys() ?? []) {
      increment(mentionSessions, name);
    }
  }

  const readNames = [...evidence.reads.keys()].map((key) => evidence.names.get(key) ?? key);
  const evidenceNames = new Set([
    ...readNames,
    ...evidence.mentions.keys(),
  ]);
  const activeSkills = [...(skillRegistry?.byName.values() ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const skillScopes = new Map(activeSkills.map((skill) => [skill.name, skill.scope]));
  const noEvidence = activeSkills
    .filter((skill) => !evidenceNames.has(skill.name))
    .map((skill) => skill.name);
  const withEvidenceCount = activeSkills.length - noEvidence.length;
  const byScope = skillScopeSummary(activeSkills, evidenceNames);

  const topReads = sortedEntries(evidence.reads).map(([key, reads]) => ({
    key,
    name: evidence.names.get(key) ?? key,
    scope: evidence.scopes.get(key) ?? skillScopes.get(evidence.names.get(key)) ?? "unknown",
    reads,
    readSessions: readSessions.get(key) ?? 0,
    mentions: evidence.mentions.get(evidence.names.get(key) ?? key) ?? 0,
    mentionSessions: mentionSessions.get(evidence.names.get(key) ?? key) ?? 0,
  }));

  return {
    activeSkills,
    withEvidenceCount,
    evidence,
    evidenceNames,
    noEvidence,
    byScope,
    skillScopes,
    topReads,
    readSessions,
    mentionSessions,
  };
}
