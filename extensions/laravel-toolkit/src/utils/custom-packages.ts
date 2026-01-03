import { LocalStorage } from "@raycast/api";

export interface CustomPackage {
  id: string;
  title: string;
  package: string;
  type: "composer" | "npm";
  description?: string;
}

const STORAGE_KEY = "custom_packages";

export async function getCustomPackages(): Promise<CustomPackage[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse custom packages:", e);
    return [];
  }
}

export async function saveCustomPackages(packages: CustomPackage[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(packages));
}

export async function addCustomPackage(pkg: Omit<CustomPackage, "id">): Promise<void> {
  const packages = await getCustomPackages();
  const newPackage = { ...pkg, id: crypto.randomUUID() };
  packages.push(newPackage);
  await saveCustomPackages(packages);
}

export async function removeCustomPackage(id: string): Promise<void> {
  const packages = await getCustomPackages();
  const filtered = packages.filter((p) => p.id !== id);
  await saveCustomPackages(filtered);
}

export async function updateCustomPackage(id: string, updates: Partial<Omit<CustomPackage, "id">>): Promise<void> {
  const packages = await getCustomPackages();
  const index = packages.findIndex((p) => p.id === id);
  if (index !== -1) {
    packages[index] = { ...packages[index], ...updates };
    await saveCustomPackages(packages);
  }
}
