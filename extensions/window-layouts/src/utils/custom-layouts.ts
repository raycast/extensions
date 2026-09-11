import { Alert, confirmAlert, LocalStorage } from "@raycast/api";

const STORAGE_KEY = "custom-layouts";

export type CustomLayout = Readonly<{
  name: string;
  grid: number[][];
  createdAt: string;
}>;

export async function getCustomLayouts(): Promise<CustomLayout[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CustomLayout[];
  } catch {
    return [];
  }
}

export async function saveCustomLayout(layout: CustomLayout): Promise<boolean> {
  const all = await getCustomLayouts();
  const existing = all.findIndex((l) => l.name === layout.name);

  if (existing >= 0) {
    const isConfirmed = await confirmAlert({
      title: `A layout named "${layout.name}" already exists. Overwrite?`,
      primaryAction: { title: "Overwrite", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Cancel" },
    });

    if (!isConfirmed) return false;

    all[existing] = layout;
  } else {
    all.push(layout);
  }

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return true;
}

export async function deleteCustomLayout(name: string): Promise<void> {
  const all = await getCustomLayouts();
  const filtered = all.filter((l) => l.name !== name);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
