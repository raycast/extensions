import { getPreferenceValues } from "@raycast/api";
import { describeFindings, findProfiles } from "../helpers/find-profiles";

type Input = {
  /** The username to look for, without the @ */
  profile: string;
  /** Check every site in the catalog that answers reliably (about 250, takes about 15 seconds) instead of the user's apps and the usual sites. Only when the user asks for everywhere, all sites, or a deep search. */
  everywhere?: boolean;
  /** Include NSFW sites. Only when the user asks for them; the Include NSFW Apps preference also turns them on. */
  includeNsfw?: boolean;
};

/**
 * Find the sites where a username has a profile, and list each one's URL
 */
export default async function tool(input: Input) {
  const found = await findProfiles(input.profile, {
    // Models send "" or a string for optional values; only an explicit true counts
    mode: String(input.everywhere) === "true" ? "everywhere" : "default",
    includeNsfw: String(input.includeNsfw) === "true" || getPreferenceValues<Preferences>().includeNsfw,
  });
  return describeFindings(found);
}
