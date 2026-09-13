import { loadAvailableSkill } from "../api/client";

type Input = {
  /** Exact caller-visible skill slug returned by find-skills. */
  slug: string;
};

/** Load one relevant caller-visible skill body; do not bulk-load the catalog. */
export default async function tool(input: Input) {
  return loadAvailableSkill(input.slug);
}
