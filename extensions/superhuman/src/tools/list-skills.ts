import { listAvailableSkills } from "../lib/skill-source";
import { ListSkillsInput, validate } from "../lib/validation";

/**
 * List every available Superhuman skill (workflow prompt). Returns each
 * skill's name, description, the tools it chains, and whether it writes to
 * the account. Use this to discover skills before calling `run-skill`.
 *
 * The list comes from the runtime resolver: upstream listing if reachable,
 * else the extension's bundled fallback.
 */
type Input = {
  /** Bypass the LocalStorage cache and re-fetch from upstream. */
  forceRefresh?: boolean;
};

interface Entry {
  name: string;
  description: string;
  tools_used: string[];
  read_only: boolean;
  source: "bundled" | "cached" | "live";
  upstream?: string;
  deprecated?: boolean;
}

export default async function tool(input: Input): Promise<{ skills: Entry[] }> {
  const parsed = validate(ListSkillsInput, input) ?? {};
  const resolved = await listAvailableSkills({ forceRefresh: parsed.forceRefresh });
  const skills: Entry[] = resolved.map((r) => ({
    name: r.skill.frontmatter.name,
    description: r.skill.frontmatter.description,
    tools_used: r.skill.frontmatter.tools_used,
    read_only: r.skill.frontmatter.read_only,
    source: r.source,
    upstream: r.skill.frontmatter.upstream,
    deprecated: r.skill.frontmatter.deprecated,
  }));
  return { skills };
}
