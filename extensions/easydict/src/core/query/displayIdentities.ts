/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { DictionarySection } from "@/core/content/types";

type IdentitySection = { readonly kind: DictionarySection["kind"]; readonly service: { readonly serviceId: string } };

/**
 * Build section identities that remain stable while providers finish in a
 * different order, but are never reused by a later query generation.
 */
export function getDisplaySectionIds(displaySections: readonly IdentitySection[], queryGeneration: number): string[] {
  const occurrenceBySection = new Map<string, number>();

  return displaySections.map((section) => {
    const sectionIdentity = `service:${section.service.serviceId}:${section.kind}`;
    const occurrence = occurrenceBySection.get(sectionIdentity) ?? 0;
    occurrenceBySection.set(sectionIdentity, occurrence + 1);
    return `query:${queryGeneration}:section:${sectionIdentity}:${occurrence}`;
  });
}

/**
 * Item positions are stable within the current provider response. Scoping the
 * index to its generation-specific section keeps IDs short and globally unique.
 */
export function getListItemId(sectionId: string, itemIndex: number): string {
  return `${sectionId}:item:${itemIndex}`;
}
