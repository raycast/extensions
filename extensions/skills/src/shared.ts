import { platform as getOsPlatform, release as getOsRelease } from "node:os";
import { environment } from "@raycast/api";

export type Skill = {
  id: string;
  skillId: string;
  name: string;
  installs: number;
  source: string;
};

export type AuditProvider = "agent-trust-hub" | "socket" | "snyk";

export type AuditStatus = "pass" | "warn" | "fail" | "unknown";

export type SkillAudit = {
  provider: AuditProvider;
  status: AuditStatus;
  url?: string;
};

export const AUDIT_PROVIDER_LABELS: Record<AuditProvider, string> = {
  "agent-trust-hub": "Gen Agent Trust Hub",
  socket: "Socket",
  snyk: "Snyk",
};

export type SearchResponse = {
  query: string;
  searchType: string;
  skills: Skill[];
  count: number;
};

export type SkillLockEntry = {
  source: string;
  sourceType: string;
  sourceUrl?: string;
  skillPath: string;
  skillFolderHash: string;
  installedAt: string;
  updatedAt: string;
};

export type InstalledSkill = {
  name: string;
  path: string;
  agents: string[];
  agentCount: number;
  hasUpdate?: boolean;
  source?: string;
  sourceUrl?: string;
  installedAt?: string;
  updatedAt?: string;
};

export type SkillFrontmatter = {
  description?: string;
  license?: string;
  compatibility?: string;
  "allowed-tools"?: string | string[];
};

/**
 * Normalizes allowed-tools to always be an array.
 * YAML parsing may return a single string instead of an array
 * when only one tool is specified (e.g., "allowed-tools: Bash").
 */
export function normalizeAllowedTools(tools: string | string[] | undefined): string[] {
  if (!tools) return [];
  if (Array.isArray(tools)) return tools;
  return [tools];
}

export const SKILLS_BASE_URL = "https://skills.sh";
export const API_BASE_URL = `${SKILLS_BASE_URL}/api`;
const REPO_URL = "https://github.com/raycast/extensions";
const ISSUE_TEMPLATE = "extension_bug_report.yml";

export function parseFrontmatter(content: string): { frontmatter: SkillFrontmatter; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const yamlStr = match[1];
  const body = match[2];
  const frontmatter: SkillFrontmatter = {};

  const lines = yamlStr.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const keyValueMatch = line.match(/^(\S[^:]*?):\s*(.*)$/);
    if (keyValueMatch) {
      const key = keyValueMatch[1].trim();
      const value = keyValueMatch[2].trim();

      if (value === "") {
        // Possibly a block array — look ahead for "  - item" lines
        const items: string[] = [];
        i++;
        while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s+-\s+/, "").trim());
          i++;
        }
        if (items.length > 0) {
          (frontmatter as Record<string, unknown>)[key] = items;
        }
        continue;
      } else if (value === "|" || value === ">" || value === "|-" || value === ">-") {
        // block scalar — multi-line body parsing is not supported, skip this key
        i++;
        continue;
      } else if (value.startsWith("[") && value.endsWith("]")) {
        // Inline array: [item1, item2, item3]
        const items = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["'](.*)["']$/, "$1"))
          .filter(Boolean);
        (frontmatter as Record<string, unknown>)[key] = items;
      } else {
        (frontmatter as Record<string, unknown>)[key] = value.replace(/^["'](.*)["']$/, "$1");
      }
    }
    i++;
  }

  return { frontmatter, body };
}

export function removeFrontmatter(content: string): string {
  return parseFrontmatter(content).body;
}

export function formatInstalls(count: number): string {
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toFixed(1)}B`;
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}

export function stripGitSuffix(url: string): string {
  return url.endsWith(".git") ? url.slice(0, -4) : url;
}

export function buildInstallCommand(skill: Skill): string {
  return `npx skills add ${skill.source}@${skill.skillId}`;
}

export function deduplicateSkills(skills: Skill[]): Skill[] {
  const seen = new Set<string>();
  return skills.filter((skill) => {
    if (seen.has(skill.id)) return false;
    seen.add(skill.id);
    return true;
  });
}

export function getOwner(skill: Skill): string {
  return skill.source.split("/")[0] || "unknown";
}

export function buildGithubIssueUrl({
  title,
  description,
  error,
  reproductionSteps = [],
}: {
  title: string;
  description: string;
  error: Error;
  reproductionSteps?: string[];
}): string {
  const issueTitle = title.startsWith("[Skills]") ? title : `[Skills] ${title}`;
  const extensionUrl = `https://www.raycast.com/${environment.ownerOrAuthorName}/${environment.extensionName}`;
  const repro = reproductionSteps.map((step, index) => `${index + 1}. ${step}`).join("\n");
  const currentBehaviour = error.stack
    ? [`Error: ${error.message}`, "", "```", error.stack, "```"].join("\n")
    : `Error: ${error.message}`;
  const query = new URLSearchParams({
    template: ISSUE_TEMPLATE,
    title: issueTitle,
    "extension-url": extensionUrl,
    "raycast-version": environment.raycastVersion,
    "os-version": `${getOsPlatform()} ${getOsRelease()}`,
    description,
    repro,
    "current-behaviour": currentBehaviour,
    "expected-behaviour": "The action should complete without throwing an error.",
  });

  return `${REPO_URL}/issues/new?${query.toString()}`;
}
