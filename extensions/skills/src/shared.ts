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
};

export const API_BASE_URL = "https://skills.sh/api";
const REPO_URL = "https://github.com/raycast/extensions";

export function removeFrontmatter(content: string): string {
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");
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
