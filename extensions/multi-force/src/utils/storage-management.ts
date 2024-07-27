import { LocalStorage } from "@raycast/api";
import { DeveloperOrg } from "../models/models";

const STORAGE_KEY = "SALESFORCE_DEVELOPER_ORGS_STORE";
const SF_PATH_STORAGE_KEY = "SALESFORCE_DEVELOPER_SF_PATH_STORE";

export async function loadOrgs(): Promise<DeveloperOrg[] | undefined> {
  const storage = await LocalStorage.getItem<string>(STORAGE_KEY);
  return storage ? (JSON.parse(storage) as DeveloperOrg[]).sort((a, b) => a.alias.localeCompare(b.alias)) : undefined;
}

export async function saveOrgs(orgs: DeveloperOrg[]) {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(orgs));
}

export async function loadSfPath(): Promise<string | undefined> {
  const storage = await LocalStorage.getItem<string>(SF_PATH_STORAGE_KEY);
  return storage ? (JSON.parse(storage) as string) : undefined;
}
