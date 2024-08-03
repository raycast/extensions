import { LocalStorage } from "@raycast/api";
import { DeveloperOrg } from "../types";
import { STORAGE_KEY } from "../constants";

export async function loadOrgs(): Promise<DeveloperOrg[]> {
  const storage = await LocalStorage.getItem<string>(STORAGE_KEY);
  return storage ? (JSON.parse(storage) as DeveloperOrg[]).sort((a, b) => a.alias.localeCompare(b.alias)) : [];
}

export async function saveOrgs(orgs: DeveloperOrg[]) {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(orgs));
}

export async function updateOrg(org: DeveloperOrg) {
  const orgs = await loadOrgs();
  const matchedOrg = orgs!.find((og) => og.alias === org.alias);
  Object.assign(matchedOrg!, org);
}
