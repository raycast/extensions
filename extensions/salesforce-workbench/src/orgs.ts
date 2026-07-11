import { LocalStorage } from "@raycast/api";
import { runSfJson } from "./cli";
import { OrgListResult, RawSalesforceOrg, SalesforceOrg } from "./types";

const ACTIVE_ORG_KEY = "active-salesforce-org-id";

export function normalizeOrgs(rawOrgs: RawSalesforceOrg[]): SalesforceOrg[] {
  const grouped = new Map<string, RawSalesforceOrg[]>();
  rawOrgs.forEach((org) => {
    const group = grouped.get(org.orgId) ?? [];
    group.push(org);
    grouped.set(org.orgId, group);
  });

  return [...grouped.values()]
    .map((group) => {
      const representative = group.find((org) => org.connectedStatus === "Connected") ?? group[0];
      const aliases = Array.from(
        new Set(
          group.flatMap((org) =>
            (org.alias ?? "")
              .split(",")
              .map((alias) => alias.trim())
              .filter(Boolean),
          ),
        ),
      );
      const isSandbox = representative.isSandbox ?? representative.instanceUrl.includes(".sandbox.");
      const canonicalAlias = aliases[0] ?? representative.username;
      return {
        orgId: representative.orgId,
        alias: canonicalAlias,
        aliases,
        username: representative.username,
        instanceUrl: representative.instanceUrl,
        loginUrl: representative.loginUrl,
        isSandbox,
        connectedStatus: representative.connectedStatus ?? "Unknown",
        instanceApiVersion: representative.instanceApiVersion ?? "67.0",
        isDefault: group.some((org) => Boolean(org.isDefaultUsername)),
        name: representative.name,
      } satisfies SalesforceOrg;
    })
    .sort((a, b) => Number(a.isSandbox) - Number(b.isSandbox) || a.alias.localeCompare(b.alias));
}

export async function listOrgs(): Promise<SalesforceOrg[]> {
  const result = await runSfJson<OrgListResult>(["org", "list", "--all"]);
  const raw = result.nonScratchOrgs ?? [
    ...(result.devHubs ?? []),
    ...(result.sandboxes ?? []),
    ...(result.other ?? []),
  ];
  return normalizeOrgs(raw);
}

export async function setActiveOrg(orgId: string): Promise<void> {
  await LocalStorage.setItem(ACTIVE_ORG_KEY, orgId);
}

export async function getActiveOrg(orgs: SalesforceOrg[]): Promise<SalesforceOrg | undefined> {
  const saved = await LocalStorage.getItem<string>(ACTIVE_ORG_KEY);
  return orgs.find((org) => org.orgId === saved) ?? orgs.find((org) => org.isDefault) ?? orgs[0];
}

export function isProduction(org: SalesforceOrg): boolean {
  return org.isSandbox === false;
}
