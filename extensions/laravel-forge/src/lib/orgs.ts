import { getCollection } from "./forge";
import { Account, accounts } from "./accounts";
import { knownOrgs, rememberOrgs } from "./index-cache";

// Nothing 404s for an org that did not exist yet, so it is refreshed, not expired
const fetchOrgs = async ({ tokenKey, token }: Account) => {
  const { items } = await getCollection("orgs", token);
  const slugs = items.map((org) => String(org.attributes?.slug ?? "")).filter(Boolean);
  await rememberOrgs(tokenKey, slugs);
  return slugs;
};

export const orgsFor = async (account: Account) => (await knownOrgs(account.tokenKey)) ?? fetchOrgs(account);

export const refreshOrgs = (account: Account) => fetchOrgs(account);

export type OrgRef = { account: Account; org: string };

export const everyOrg = async (): Promise<OrgRef[]> => {
  const perAccount = await Promise.all(
    accounts().map(async (account) => (await orgsFor(account)).map((org) => ({ account, org }))),
  );
  return perAccount.flat();
};

// A slug the model handed back is only trusted if we already knew it: org goes in the path
export const isKnownOrg = async (tokenKey: string, org: string) => {
  const account = accounts().find((one) => one.tokenKey === tokenKey);
  if (!account) return false;
  return (await orgsFor(account)).includes(org);
};
