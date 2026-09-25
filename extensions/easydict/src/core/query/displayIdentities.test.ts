/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { describe, expect, it } from "vitest";

import { LingueeListItemType } from "@/providers/dictionary/linguee/types";
import { DictionaryType, TranslationType } from "@/types/api";
import type { DisplaySection, ListDisplayItem } from "@/types/display";

import { getDisplaySectionIds, getListItemId } from "./displayIdentities";

describe("display identities", () => {
  it("keeps a provider section stable when an earlier provider result arrives", () => {
    const google = createSection("static:google", TranslationType.Google, TranslationType.Google);
    const linguee = createSection("static:linguee", DictionaryType.Linguee, LingueeListItemType.Translation);

    const originalSectionId = getDisplaySectionIds([google], 4)[0];
    const sectionIdAfterInsert = getDisplaySectionIds([linguee, google], 4)[1];

    expect(sectionIdAfterInsert).toBe(originalSectionId);
  });

  it("distinguishes configured services that share the same provider type", () => {
    const firstProfile = createSection("profile:first", TranslationType.OpenAI, TranslationType.OpenAI);
    const secondProfile = createSection("profile:second", TranslationType.OpenAI, TranslationType.OpenAI);

    const sectionIds = getDisplaySectionIds([firstProfile, secondProfile], 4);

    expect(sectionIds[0]).not.toBe(sectionIds[1]);
  });

  it("does not reuse section or item IDs across query generations", () => {
    const sections = [createSection("static:google", TranslationType.Google, TranslationType.Google)];
    const firstSectionId = getDisplaySectionIds(sections, 4)[0];
    const nextSectionId = getDisplaySectionIds(sections, 5)[0];

    expect(firstSectionId).not.toBe(nextSectionId);
    expect(getListItemId(firstSectionId, 0)).not.toBe(getListItemId(nextSectionId, 0));
  });

  it("uses item position to distinguish items in one section", () => {
    const sectionId = getDisplaySectionIds(
      [createSection("static:google", TranslationType.Google, TranslationType.Google)],
      1,
    )[0];

    expect(getListItemId(sectionId, 0)).not.toBe(getListItemId(sectionId, 1));
  });
});

function createSection(
  serviceId: string,
  queryType: ListDisplayItem["queryType"],
  type: DisplaySection["type"],
): DisplaySection {
  const queryWordInfo = { word: "test", fromLanguage: "en", toLanguage: "zh-CHS" };
  const item = {
    queryType,
    queryWordInfo,
    key: "mutable-result-text",
    title: "Mutable Result Text",
    copyText: "Mutable Result Text",
  } as ListDisplayItem;

  return { serviceId, type, items: [item] };
}
