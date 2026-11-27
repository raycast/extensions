import { withAccessToken } from "@raycast/utils";
import { github, parseLogin, viewerLogin } from "../lib/github";
import { freshCard, profileStats } from "../lib/stats";

type Input = {
  /** A GitHub login, such as "gfazioli". Leave it empty for the signed-in user's own profile. */
  login?: string;
};

/**
 * The numbers on a GitHub profile's glancecard: followers, stars across public repositories,
 * contributions and commits in the last year, pull requests and issues, the most starred
 * repositories, languages, and the star history (stars in the last 30 days and the last year).
 */
async function tool(input: Input) {
  const typed = String(input.login ?? "").trim();
  const login = typed ? parseLogin(typed) : await viewerLogin();
  if (!login)
    throw new Error(
      `"${typed}" is not a GitHub login: give a login such as "octocat", or nothing for your own profile`,
    );
  return profileStats(await freshCard({ kind: "profile", login }));
}

export default withAccessToken(github)(tool);
