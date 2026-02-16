import { LocalStorage } from "@raycast/api";
import { ProfileMetadata, ProfileMetadataMap } from "./types";

const STORAGE_KEY = "browser-profile-manager.metadata.v1";

export async function getProfileMetadataMap(): Promise<ProfileMetadataMap> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as ProfileMetadataMap;
    const output: ProfileMetadataMap = {};

    for (const [profileId, metadata] of Object.entries(parsed)) {
      const alias = metadata?.alias?.trim();
      const tags = normalizeTags(metadata?.tags ?? []);
      output[profileId] = {
        alias,
        tags,
      };
    }

    return output;
  } catch {
    return {};
  }
}

export async function setProfileAlias(
  profileId: string,
  alias: string,
): Promise<void> {
  const metadataMap = await getProfileMetadataMap();
  const existing = metadataMap[profileId] ?? { tags: [] };

  metadataMap[profileId] = {
    ...existing,
    alias: alias.trim(),
    tags: normalizeTags(existing.tags),
  };

  await persistMetadataMap(metadataMap);
}

export async function removeProfileAlias(profileId: string): Promise<void> {
  const metadataMap = await getProfileMetadataMap();
  const existing = metadataMap[profileId];
  if (!existing) {
    return;
  }

  const cleaned: ProfileMetadata = {
    tags: normalizeTags(existing.tags),
  };

  if (cleaned.tags.length === 0) {
    delete metadataMap[profileId];
  } else {
    metadataMap[profileId] = cleaned;
  }

  await persistMetadataMap(metadataMap);
}

export async function setProfileTags(
  profileId: string,
  tags: string[],
): Promise<void> {
  const metadataMap = await getProfileMetadataMap();
  const existing = metadataMap[profileId];
  const normalizedTags = normalizeTags(tags);

  if (normalizedTags.length === 0 && !existing?.alias) {
    delete metadataMap[profileId];
  } else {
    metadataMap[profileId] = {
      alias: existing?.alias?.trim(),
      tags: normalizedTags,
    };
  }

  await persistMetadataMap(metadataMap);
}

async function persistMetadataMap(
  metadataMap: ProfileMetadataMap,
): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(metadataMap));
}

function normalizeTags(tags: string[]): string[] {
  const unique = new Set<string>();
  for (const tag of tags) {
    const normalized = tag.trim();
    if (normalized) {
      unique.add(normalized);
    }
  }

  return [...unique].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" }),
  );
}
