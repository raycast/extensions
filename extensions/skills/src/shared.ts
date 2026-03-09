export type Skill = {
  id: string;
  skillId: string;
  name: string;
  installs: number;
  source: string;
};

export type SearchResponse = {
  query: string;
  searchType: string;
  skills: Skill[];
  count: number;
};

export type InstalledSkill = {
  name: string;
  path: string;
  agents: string[];
  agentCount: number;
  hasUpdate?: boolean;
};

export type SkillFrontmatter = {
  description?: string;
  license?: string;
  compatibility?: string;
  "allowed-tools"?: string[];
};

export const API_BASE_URL = "https://skills.sh/api";
const REPO_URL = "https://github.com/raycast/extensions";

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
  return (skill.source ?? "").split("/")[0] || "unknown";
}

export function buildIssueUrl(endpoint: string, error: Error): string {
  const title = encodeURIComponent(`[API Error] ${endpoint} request failed`);
  const body = encodeURIComponent(
    `## Error Details\n\n- **Endpoint:** \`${endpoint}\`\n- **Error:** ${error.message}\n- **Date:** ${new Date().toISOString()}\n`,
  );
  return `${REPO_URL}/issues/new?title=${title}&body=${body}`;
}
