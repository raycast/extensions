import { describe, expect, it } from "vitest";

import { screenLexActions } from "./actions";

describe("screenLexActions", () => {
  it("maps every supported action to its ScreenLex deep link", () => {
    expect(screenLexActions.map(({ id, url }) => [id, url])).toEqual([
      ["capture-area", "screenlex-v1://capture/area"],
      ["capture-window", "screenlex-v1://capture/window"],
      ["capture-full-screen", "screenlex-v1://capture/full-screen"],
      ["translate-area", "screenlex-v1://translate/area"],
      ["translate-window", "screenlex-v1://translate/window"],
      ["translate-full-screen", "screenlex-v1://translate/full-screen"],
      ["open-library", "screenlex-v1://open/library"],
      ["open-recent", "screenlex-v1://open/recent"],
      ["open-settings", "screenlex-v1://open/settings"],
    ]);
  });

  it("keeps action identifiers unique", () => {
    const ids = screenLexActions.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
