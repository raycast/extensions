import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_COMMUNITY_INDEX_URL, readPreferences } from "./preferences";
import { preferences, resetRaycastMock } from "./test/raycast-api";

afterEach(resetRaycastMock);

describe("readPreferences", () => {
  it("falls back to defaults when preferences are unset", () => {
    expect(readPreferences()).toEqual({
      mood: "mua",
      wordsPerPage: 350,
      focusMode: false,
      communityIndexUrl: DEFAULT_COMMUNITY_INDEX_URL,
    });
  });

  it("reads, trims, and clamps configured values", () => {
    Object.assign(preferences, {
      theme: "cung",
      wordsPerPage: "5000",
      focusMode: true,
      communityIndexUrl: "  https://cdn.example/index.json ",
    });

    expect(readPreferences()).toEqual({
      mood: "cung",
      wordsPerPage: 2000,
      focusMode: true,
      communityIndexUrl: "https://cdn.example/index.json",
    });
  });

  it("ignores unknown moods and blank index URLs", () => {
    Object.assign(preferences, { theme: "neon", communityIndexUrl: "   " });

    expect(readPreferences()).toMatchObject({ mood: "mua", communityIndexUrl: DEFAULT_COMMUNITY_INDEX_URL });
  });
});
