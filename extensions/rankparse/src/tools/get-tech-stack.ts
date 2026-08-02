import { techStack } from "../lib/tech-stack";

type Input = {
  /** The domain to detect technologies for, e.g. "stripe.com". */
  domain: string;
};

/**
 * Detect the technology stack (CMS, framework, analytics, hosting, etc.) used by a domain.
 * Costs 2 RankParse credits per call.
 */
export default async function tool(input: Input) {
  const result = await techStack(input.domain);
  return result.data;
}
