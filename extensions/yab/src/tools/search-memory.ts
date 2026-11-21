import { cli } from "../yab";

type Input = {
  /** Words to look for. */
  query: string;
};

/** What Yab has learned about the user and the people, companies, sites and projects in their life: matching lines with their note's name. */
export default async function tool(input: Input) {
  const { stdout } = await cli(["memory", "search", ...input.query.split(/\s+/).filter(Boolean), "--json"]);
  try {
    return JSON.parse(stdout);
  } catch {
    return [];
  }
}
