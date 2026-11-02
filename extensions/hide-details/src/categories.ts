import { LocalStorage, getPreferenceValues } from "@raycast/api";

export const categories = ["email", "phone", "card", "secret", "ip", "name", "face"] as const;
export type Category = (typeof categories)[number];
export const categoryLabels: Record<Category, string> = {
  email: "Email Addresses",
  phone: "Phone Numbers",
  card: "Card Numbers",
  secret: "Secrets",
  ip: "IP Addresses",
  name: "Names and Custom Words",
  face: "Faces",
};

const storageKey = "categories-v1";

function validate(values: unknown): Category[] {
  if (!Array.isArray(values) || values.some((value) => !categories.includes(value))) {
    throw new Error("Invalid category settings. Open Configure What to Hide to choose categories again.");
  }
  return categories.filter((category) => values.includes(category));
}

export async function loadCategories(): Promise<Category[]> {
  const saved = await LocalStorage.getItem<string>(storageKey);
  if (saved !== undefined) {
    try {
      return validate(JSON.parse(saved));
    } catch {
      throw new Error("Invalid category settings. Open Configure What to Hide to choose categories again.");
    }
  }
  // Keep the manifest key until existing installations have had a chance to migrate.
  // In particular, an explicitly empty legacy selection means custom regex only.
  const legacy = getPreferenceValues<Preferences>().categories ?? categories.join(",");
  return validate(
    legacy
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function saveCategories(values: Category[]) {
  await LocalStorage.setItem(storageKey, JSON.stringify(validate(values)));
}

export async function restoreLegacyCategories() {
  await LocalStorage.removeItem(storageKey);
}
