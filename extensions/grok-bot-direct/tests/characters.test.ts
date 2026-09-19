import { describe, expect, it } from "vitest";
import {
  characterIdentity,
  characterSources,
  resolveCharacterImage,
} from "../src/core/characters";

describe("desktop character compatibility", () => {
  it("falls back without bundling third-party artwork and prefers supplied raster images", () => {
    const bot = { id: "abc", avatarShape: "wedge", avatarColor: "red" };
    expect(resolveCharacterImage(bot, "/local", () => false)).toEqual({
      color: "#FF3E51",
    });
    expect(
      resolveCharacterImage(
        { ...bot, avatarDataUrl: "data:image/png;base64,YQ==" },
        "/local",
        () => false,
      ).source,
    ).toBe("data:image/png;base64,YQ==");
    expect(
      resolveCharacterImage(
        { ...bot, avatarDataUrl: "https://example.test/image.png" },
        "/local",
        () => false,
      ).source,
    ).toBeUndefined();
    expect(
      resolveCharacterImage(bot, "/local", (path) =>
        path.endsWith("-light.svg"),
      ).source,
    ).toBeUndefined();
  });
  // Independent expected values from the installed 0.43.0 renderer using synthetic IDs.
  it.each([
    ["", "hex", "blue"],
    ["fixture-bot", "squircle", "cyan"],
    ["00000000-0000-0000-0000-000000000001", "squircle", "violet"],
    ["😀", "blob", "gray"],
    ["abc", "hex", "cyan"],
  ])("matches the desktop avatar for %s", (id, shape, color) => {
    const bot = { id, avatarShape: null, avatarColor: null };
    expect(characterIdentity(bot)).toEqual({ shape, color });
    const sources = characterSources(bot);
    const local = resolveCharacterImage(
      bot,
      "/local",
      (path) =>
        path === `/local/${sources.light}` || path === `/local/${sources.dark}`,
    );
    expect(local.source).toEqual({
      light: `/local/${sources.light}`,
      dark: `/local/${sources.dark}`,
    });
  });
  it("respects explicit character choices and rejects path injection", () => {
    expect(
      characterIdentity({
        id: "abc",
        avatarShape: "cloud",
        avatarColor: "black",
      }),
    ).toEqual({ shape: "cloud", color: "black" });
    expect(
      characterIdentity({
        id: "abc",
        avatarShape: "wedge",
        avatarColor: "red",
      }),
    ).toEqual({ shape: "wedge", color: "red" });
    expect(
      characterIdentity({
        id: "abc",
        avatarShape: "../../private",
        avatarColor: "unknown",
      }),
    ).toEqual({ shape: "hex", color: "cyan" });
  });
});
