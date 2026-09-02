import { everyOrg } from "../lib/orgs";

export default async function tool() {
  const orgs = await everyOrg();
  if (!orgs.length) {
    return { note: "No Forge organizations are reachable. Check the API token in extension preferences.", orgs: [] };
  }
  return {
    note: "Organizations you can reach. The list and get tools use these on their own. You do not pass one.",
    orgs: orgs.map(({ account, org }) => ({ account: account.tokenKey, org })),
  };
}
