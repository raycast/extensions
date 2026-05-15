import { LocalStorage } from "@raycast/api";

export interface SavedIdentity {
  id: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  ssn: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  stateAbbr: string;
  zipCode: string;
  createdAt: string;
}

const STORAGE_KEY = "saved-identities";

export async function getSavedIdentities(): Promise<SavedIdentity[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedIdentity[];
  } catch {
    return [];
  }
}

export async function saveIdentity(identity: SavedIdentity): Promise<void> {
  const items = await getSavedIdentities();
  items.unshift(identity);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function deleteIdentity(id: string): Promise<void> {
  const items = await getSavedIdentities();
  const filtered = items.filter((item) => item.id !== id);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
