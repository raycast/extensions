import { getStartup } from "../lib/api";

type Input = {
  /** TrustMRR startup slug, such as "datafast". */
  slug: string;
};

/** Get detailed metrics for one TrustMRR startup. */
export default async function tool(input: Input) {
  return getStartup(input.slug);
}
