import { LocalStorage } from "@raycast/api";

export type OrgMeta = {
  label?: string;
  tags?: string[];
};

const keyFor = (username: string) => `org-meta:${username}`;

export async function getOrgMeta(username: string): Promise<OrgMeta> {
  const raw = await LocalStorage.getItem<string>(keyFor(username));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as OrgMeta;
  } catch {
    return {};
  }
}

export async function setOrgMeta(username: string, meta: OrgMeta): Promise<void> {
  const current = await getOrgMeta(username);
  const next: OrgMeta = {
    ...current,
    ...meta,
    tags: dedupe(meta.tags ?? current.tags ?? []),
  };
  await LocalStorage.setItem(keyFor(username), JSON.stringify(next));
}

export async function getAllOrgMeta(): Promise<Record<string, OrgMeta>> {
  const all = await LocalStorage.allItems();
  const out: Record<string, OrgMeta> = {};
  for (const [k, v] of Object.entries(all)) {
    if (!k.startsWith("org-meta:")) continue;
    try {
      out[k.replace("org-meta:", "")] = JSON.parse(String(v));
    } catch {
      // skip
    }
  }
  return out;
}

function dedupe(arr: string[]) {
  return Array.from(new Set(arr.map((t) => t.trim()).filter(Boolean)));
}
