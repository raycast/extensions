/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { DisplaySection } from "@/types/display";

/**
 * Build section identities that remain stable while providers finish in a
 * different order, but are never reused by a later query generation.
 */
export function getDisplaySectionIds(displaySections: DisplaySection[], queryGeneration: number): string[] {
  const occurrenceBySection = new Map<string, number>();

  return displaySections.map((section) => {
    const providerIdentity = section.serviceId
      ? `service:${section.serviceId}`
      : `query-type:${section.items[0]?.queryType ?? section.type}`;
    const sectionIdentity = `${providerIdentity}:${section.type}`;
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
