// Copyright (c) 2026 SENTINELITE | FTRBND | Kirkland Layton
// SPDX-License-Identifier: MIT

import { MarkerTagSummary, listMarkerTags } from "./marker-api";
import { MarkerSettings } from "./marker-api";
import { optionalTrimmed } from "./marker-ui";

export async function resolveTagIDs(
  settings: MarkerSettings,
  sessionID: string,
  tagQuery: string | undefined,
): Promise<string[]> {
  const requestedTags = splitTagQuery(tagQuery);
  if (!requestedTags.length) {
    return [];
  }

  const tags = await listMarkerTags({ ...settings, sessionID });
  return requestedTags.flatMap((query) => {
    const tag = findTag(tags, query);
    return tag ? [tag.id] : [];
  });
}

function splitTagQuery(value: string | undefined): string[] {
  return (
    optionalTrimmed(value)
      ?.split(",")
      .map((tag) => tag.trim())
      .filter(Boolean) ?? []
  );
}

function findTag(
  tags: MarkerTagSummary[],
  query: string,
): MarkerTagSummary | undefined {
  const normalizedQuery = query.toLocaleLowerCase();
  return (
    tags.find((tag) => tag.id.toLocaleLowerCase() === normalizedQuery) ??
    tags.find((tag) => tag.clientID?.toLocaleLowerCase() === normalizedQuery) ??
    tags.find((tag) => tag.name.toLocaleLowerCase() === normalizedQuery)
  );
}
