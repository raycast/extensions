import { listAvailableSkills } from "../api/client";

type Input = {
  /** Search the skills you can use in the current Synap lens. */
  query?: string;
  /** Filter by one skill topic. */
  topic?: string;
  /** Filter by one skill tag. */
  tag?: string;
  /** Maximum catalog entries to return (default 10, max 25). */
  limit?: number;
};

/**
 * Search the caller-visible skill index. The server enforces the canonical
 * pod, owner, workspace-membership, instruction, active, and approval gates.
 */
export default async function tool(input: Input) {
  const result = await listAvailableSkills({
    query: input.query,
    topic: input.topic,
    tag: input.tag,
    limit: Math.min(Math.max(input.limit ?? 10, 1), 25),
  });

  // The REST list endpoint deliberately shares one wire format with direct
  // consumers and includes `body`. Raycast must retain progressive disclosure:
  // show metadata here and load the chosen body through load-skill.
  const skills = result.skills.map(({ body: _body, ...skill }) => skill);
  if (result.total === 0) {
    return {
      total: 0,
      skills: [],
      hint: "No caller-visible instruction skills in this lens (Hub: active + approved). This is not a pack catalog — capabilities use list-capabilities.",
    };
  }

  return {
    total: result.total,
    skills,
    hint: "Choose one relevant slug, then call load-skill. Do not bulk-load skill bodies.",
  };
}
