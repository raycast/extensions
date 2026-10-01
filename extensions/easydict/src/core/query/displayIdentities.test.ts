/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { describe, expect, it } from "vitest";

import { getDisplaySectionIds, getListItemId } from "./displayIdentities";

describe("display identities", () => {
  it("keeps a provider section stable when an earlier provider result arrives", () => {
    const google = createSection("static:google");
    const linguee = createSection("static:linguee");

    const originalSectionId = getDisplaySectionIds([google], 4)[0];
    const sectionIdAfterInsert = getDisplaySectionIds([linguee, google], 4)[1];

    expect(sectionIdAfterInsert).toBe(originalSectionId);
  });

  it("distinguishes configured services that share the same provider type", () => {
    const firstProfile = createSection("profile:first");
    const secondProfile = createSection("profile:second");

    const sectionIds = getDisplaySectionIds([firstProfile, secondProfile], 4);

    expect(sectionIds[0]).not.toBe(sectionIds[1]);
  });

  it("does not reuse section or item IDs across query generations", () => {
    const sections = [createSection("static:google")];
    const firstSectionId = getDisplaySectionIds(sections, 4)[0];
    const nextSectionId = getDisplaySectionIds(sections, 5)[0];

    expect(firstSectionId).not.toBe(nextSectionId);
    expect(getListItemId(firstSectionId, 0)).not.toBe(getListItemId(nextSectionId, 0));
  });

  it("keeps repeated sections from the same provider distinct", () => {
    const section = { kind: "equivalents" as const, service: { serviceId: "dictionary:linguee" } };
    const ids = getDisplaySectionIds([section, section], 1);
    expect(new Set(ids).size).toBe(2);
    expect(getListItemId(ids[0], 0)).not.toBe(getListItemId(ids[1], 0));
  });

  it("uses item position to distinguish items in one section", () => {
    const sectionId = getDisplaySectionIds([createSection("static:google")], 1)[0];

    expect(getListItemId(sectionId, 0)).not.toBe(getListItemId(sectionId, 1));
  });
});

function createSection(serviceId: string) {
  return { kind: "translation" as const, service: { serviceId } };
}
