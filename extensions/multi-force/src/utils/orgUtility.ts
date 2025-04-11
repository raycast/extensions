import { DeveloperOrg } from "../types";

export function deduplicateList(orgs: DeveloperOrg[]): DeveloperOrg[] {
  const newOrgsMap = new Map(orgs.map((org) => [org.username, org]));
  return Array.from(newOrgsMap.values()).flat();
}

export function flattenOrgMap(orgs: Map<string, DeveloperOrg[]>): DeveloperOrg[] {
  return Array.from(orgs.values()).flat();
}

export function combineOrgList(existingOrgs: DeveloperOrg[], newOrgs: DeveloperOrg[]): DeveloperOrg[] {
  // Create a map from the new Orgs so we have an easy lookup from username to Org
  const newOrgsMap = new Map(newOrgs.map((org) => [org.username, org]));

  // Filter the existing orgs to include only those that exist in the new list
  const updatedOrgs = existingOrgs.filter((org) => newOrgsMap.has(org.username));

  // Merge the existing org fields with the new org fields
  const mergedOrgs = updatedOrgs.map((org) => ({
    ...org,
    ...newOrgsMap.get(org.username),
  }));

  // Add new orgs that are not present in the existing list
  const additionalOrgs = newOrgs.filter(
    (org) => !existingOrgs.some((existingOrg) => existingOrg.username === org.username),
  );

  // Combine merged orgs and additional new orgs
  const combinedOrgs = [...mergedOrgs, ...additionalOrgs];

  // Sort and deduplicate the combined list by alias
  return deduplicateList(sortOrgList(combinedOrgs));
}

export function orgListsAreDifferent(orgs1: DeveloperOrg[], orgs2: DeveloperOrg[]): boolean {
  const aliases1 = new Set(orgs1.map((org) => org.alias));
  const aliases2 = new Set(orgs2.map((org) => org.alias));

  // Calculate the intersection of both sets
  const intersection = new Set([...aliases1].filter((alias) => aliases2.has(alias)));

  // If the size of the intersection is not equal to the size of either set,
  // there is a discrepancy (meaning some aliases are missing or extra)
  return intersection.size !== aliases1.size || intersection.size !== aliases2.size || orgs1.length !== orgs2.length;
}

export function removeOrgByAlias(orgs: DeveloperOrg[], aliasToRemove: string): DeveloperOrg[] {
  return orgs.filter((org) => org.alias !== aliasToRemove);
}

export function sortOrgList(orgs: DeveloperOrg[]): DeveloperOrg[] {
  orgs.sort((a, b) => a.alias.localeCompare(b.alias));
  return orgs;
}
