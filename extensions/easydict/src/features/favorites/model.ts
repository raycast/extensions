/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { ComposedService } from "@/core/content/compose";
import type { PrimarySupplement } from "@/core/content/types";
import type {
  ProviderResult,
  QueryInput,
  QueryType,
  QueryWordInfo,
  RuntimeServiceMetadata,
} from "@/core/results/types";

import type { LegacySavedContent } from "./legacy";
import { getFavoriteView } from "./view";

export type SavedService = (ProviderResult | { readonly type: QueryType; readonly content: LegacySavedContent }) &
  RuntimeServiceMetadata & { readonly primarySupplement?: PrimarySupplement };

export interface FavoriteWord {
  readonly query: QueryWordInfo;
  readonly services: readonly SavedService[];
  readonly createdAt: number;
  /** The resolved preview of an older display snapshot, whose content may not reproduce it. */
  readonly legacyPreview?: readonly string[];
}

/** Save already composed content; later provider settings must not change this snapshot. */
export function buildFavoriteWord(query: QueryWordInfo, services: readonly ComposedService[]): FavoriteWord {
  return {
    query,
    services: services.map(
      ({ type, content, serviceId, serviceLabel, serviceOrder, serviceIcon, primarySupplement }) =>
        ({ type, content, serviceId, serviceLabel, serviceOrder, serviceIcon, primarySupplement }) as SavedService,
    ),
    createdAt: Date.now(),
  };
}

/** Derive fresh previews from the same lightweight rows used to display the saved content. */
export function resolveFavoriteTranslations(favorite: FavoriteWord): readonly string[] | undefined {
  if (favorite.legacyPreview?.length) return favorite.legacyPreview;
  const freshServices = favorite.services.filter((service) => service.content.kind !== "legacy");
  const sections = getFavoriteView({ ...favorite, services: freshServices });
  const translation = sections.find((section) => section.service.kind === "translation")?.items[0];
  if (translation?.copyText) {
    const lines = translation.copyText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length) return lines;
  }
  for (const section of sections) {
    if (section.service.kind !== "dictionary") continue;
    for (const item of section.items) {
      if (item.kind === "translation" && item.title.trim()) return [item.title.trim()];
    }
  }
  return undefined;
}

/** The same text with a different translation direction is a separate favorite. */
export function favoriteKeyOf(query: QueryInput): string {
  return `${query.word}\u0000${query.fromLanguage}\u0000${query.toLanguage}`;
}
