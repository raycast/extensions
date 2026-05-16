import { isReadOnly } from "../lib/readonly";
import { getSkill, resolveSlug, listAvailableSkills } from "../lib/skill-source";
import { RunSkillInput, validate } from "../lib/validation";

/**
 * Load a Superhuman skill (a multi-step workflow prompt) and return its
 * instructions plus the tools it expects to chain.
 *
 * After calling this, follow the returned prompt step-by-step, calling the
 * listed tools as needed. The prompt assumes the calling AI session has
 * access to the same `@superhuman` toolset this extension provides.
 *
 * Use `list-skills` first if you don't already know the skill name.
 * `skill_name` accepts either a slug ("morning-briefing") or a fuzzy
 * title ("Morning Briefing", "morning briefing", or even a partial match
 * like "briefing").
 */
type Input = {
  /** Skill slug or fuzzy title. */
  skillName: string;
  /** Bypass the LocalStorage cache and re-fetch from upstream. */
  forceRefresh?: boolean;
};

interface Output {
  skill_name: string;
  description: string;
  prompt: string;
  tools_used: string[];
  read_only: boolean;
  read_only_blocked: boolean;
  source: "bundled" | "cached" | "live";
  upstream?: string;
  upstream_sha?: string;
  fetched_at?: string;
  notes?: string;
}

export default async function tool(input: Input): Promise<Output> {
  const parsed = validate(RunSkillInput, input);

  const catalog = await listAvailableSkills();
  const knownNames = catalog.map((c) => c.skill.frontmatter.name);
  const slug = resolveSlug(parsed.skillName, knownNames);
  if (!slug) {
    throw new Error(`Unknown skill "${parsed.skillName}". Known skills: ${knownNames.join(", ") || "(none)"}.`);
  }

  const resolved = await getSkill(slug, { forceRefresh: parsed.forceRefresh });
  const { frontmatter, body } = resolved.skill;
  const blocked = !frontmatter.read_only && isReadOnly();

  return {
    skill_name: frontmatter.name,
    description: frontmatter.description,
    prompt: body.trim(),
    tools_used: frontmatter.tools_used,
    read_only: frontmatter.read_only,
    read_only_blocked: blocked,
    source: resolved.source,
    upstream: frontmatter.upstream,
    upstream_sha: resolved.upstreamSha ?? frontmatter.upstream_sha,
    fetched_at: resolved.fetchedAt ? new Date(resolved.fetchedAt).toISOString() : undefined,
    notes: blocked
      ? "Read-only mode is on; this skill writes to the account. Refuse the request and ask the user to disable Read-only mode in extension preferences."
      : undefined,
  };
}
