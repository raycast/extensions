import { accounts } from "./accounts";
import { refreshOrgs } from "./orgs";

// A new org never 404s, so this 10s refresh is where one gets noticed
export const warmOrgCache = () => {
  Promise.all(accounts().map((account) => refreshOrgs(account).catch(() => undefined))).catch(() => undefined);
};
