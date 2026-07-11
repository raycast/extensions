import { LocalStorage } from "@raycast/api";
import { runSfJson } from "./cli";
import { OrgListResult, RawSalesforceOrg, SalesforceAlias, SalesforceOrg } from "./types";

const ACTIVE_ORG_KEY = "active-salesforce-org-id";
let pendingOrgList: Promise<SalesforceOrg[]> | undefined;

export function normalizeOrgs(rawOrgs: RawSalesforceOrg[], configuredAliases: SalesforceAlias[] = []): SalesforceOrg[] {
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
          [
            ...group.flatMap((org) => (org.alias ?? "").split(",")),
            ...configuredAliases
              .filter((configured) => configured.value === representative.username)
              .map((configured) => configured.alias),
          ]
            .map((alias) => alias.trim())
            .filter(Boolean),
        ),
      );
      const isSandbox = inferIsSandbox(representative);
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
  if (pendingOrgList) return pendingOrgList;
  pendingOrgList = (async () => {
    const result = await runSfJson<OrgListResult>(["org", "list", "--all"]);
    const raw = result.nonScratchOrgs ?? [
      ...(result.devHubs ?? []),
      ...(result.sandboxes ?? []),
      ...(result.other ?? []),
    ];
    let configuredAliases: SalesforceAlias[] = [];
    try {
      configuredAliases = await runSfJson<SalesforceAlias[]>(["alias", "list"], { timeoutMs: 10_000 });
    } catch {
      // Alias enrichment is optional; authenticated orgs should still load if
      // an older CLI does not support alias:list or its configuration is bad.
    }
    return normalizeOrgs(raw, configuredAliases);
  })();
  try {
    return await pendingOrgList;
  } finally {
    pendingOrgList = undefined;
  }
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

export function inferIsSandbox(org: RawSalesforceOrg): boolean {
  if (org.isSandbox !== undefined) return org.isSandbox;
  return [org.instanceUrl, org.loginUrl].some((value) => {
    if (!value) return false;
    try {
      const hostname = new URL(value).hostname.toLowerCase();
      return hostname === "test.salesforce.com" || hostname.includes(".sandbox.") || /^cs\d+\./.test(hostname);
    } catch {
      return false;
    }
  });
}
