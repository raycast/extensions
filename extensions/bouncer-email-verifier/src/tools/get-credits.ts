import { fetchCredits } from "../lib/bouncer";

/** Free to call — the credits endpoint does not consume a verification credit. */
export default async function getCreditsTool() {
  return { credits: await fetchCredits(), creditsSpent: 0 };
}
