import { withAccessToken } from "@raycast/utils";
import { github, parseRepository } from "../lib/github";
import { freshCard, repositoryStats } from "../lib/stats";

type Input = {
  /** The repository as owner/name, such as "gfazioli/glancecard", or its GitHub URL. */
  repository: string;
};

/**
 * The numbers on a public GitHub repository's glancecard: stars and their history (last 30
 * days, last year, best week), commits in the last 30 days and the last year, streaks, the
 * busiest weekday and hour, languages, releases, contributors, issues and pull requests.
 */
async function tool(input: Input) {
  const typed = String(input.repository ?? "").trim();
  const full = parseRepository(typed);
  if (!full) throw new Error(`"${typed}" is not a repository: give it as owner/name, such as "gfazioli/glancecard"`);
  return repositoryStats(await freshCard({ kind: "repo", full }));
}

export default withAccessToken(github)(tool);
