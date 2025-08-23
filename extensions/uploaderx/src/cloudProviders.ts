import { LocalStorage } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";

export enum CloudProviderType {
  S3 = "s3",
  BunnyCDN = "bunnycdn",
}

export type CloudProviderAccount = {
  id: string;
  providerType: CloudProviderType;
  displayName: string;
  credentials: Record<string, string>; // For S3: { accessKeyId, secretAccessKey, bucket, endpoint, region }, BunnyCDN: { storageZone, apiKey }
  defaultPath: string;
  accessLevel: "public" | "private";
  isDefault?: boolean;
};

const STORAGE_KEY = "cloudProviders";

export async function getAllProviders(): Promise<CloudProviderAccount[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CloudProviderAccount[];
  } catch {
    return [];
  }
}

export async function saveAllProviders(providers: CloudProviderAccount[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
}

export async function addOrUpdateProvider(account: CloudProviderAccount): Promise<void> {
  const providers = await getAllProviders();
  const idx = providers.findIndex((p) => p.id === account.id);
  if (idx >= 0) {
    providers[idx] = account;
  } else {
    providers.push(account);
  }
  await saveAllProviders(providers);
}

export async function deleteProvider(id: string): Promise<void> {
  const providers = await getAllProviders();
  const filtered = providers.filter((p) => p.id !== id);
  await saveAllProviders(filtered);
}

export async function setDefaultProvider(id: string): Promise<void> {
  const providers = await getAllProviders();
  providers.forEach((p) => (p.isDefault = p.id === id));
  await saveAllProviders(providers);
}

export async function getDefaultProvider(): Promise<CloudProviderAccount | undefined> {
  const providers = await getAllProviders();
  return providers.find((p) => p.isDefault);
}

export function createNewProviderAccount(
  providerType: CloudProviderType,
  displayName: string,
  credentials: Record<string, string>,
  defaultPath: string,
  accessLevel: "public" | "private" = "public",
): CloudProviderAccount {
  return {
    id: uuidv4(),
    providerType,
    displayName,
    credentials,
    defaultPath,
    accessLevel,
    isDefault: false,
  };
}
