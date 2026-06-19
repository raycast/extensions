import assert from "node:assert/strict";
import test from "node:test";
import { menuTitle, resolveMenuBarTemplate } from "./now-playing-menubar-display";

const okState = {
  track: "Song",
  artist: "Artist",
  album: "Album",
  artworkUrl: "/tmp/artwork.png",
  status: "ok" as const,
};

test("returns the preset template for track and artist mode", () => {
  assert.equal(resolveMenuBarTemplate("track-artist", "{track}"), "{track} — {artist}");
});

test("returns the preset template for track-only mode", () => {
  assert.equal(resolveMenuBarTemplate("track-only", "{track} — {artist}"), "{track}");
});

test("returns the preset template for artist-only mode", () => {
  assert.equal(resolveMenuBarTemplate("artist-only", "{track} — {artist}"), "{artist}");
});

test("returns the preset template for track and album mode", () => {
  assert.equal(resolveMenuBarTemplate("track-album", "{track} — {artist}"), "{track} — {album}");
});

test("preserves the user template for custom mode", () => {
  assert.equal(resolveMenuBarTemplate("custom", "{track} | {artist}"), "{track} | {artist}");
});

test("returns no text for artwork-only mode", () => {
  assert.equal(menuTitle(okState, "artwork-only", "{track} — {artist}"), "");
});

test("removes hanging separators when album is missing", () => {
  assert.equal(menuTitle({ ...okState, album: "" }, "track-album", "{track} — {artist}"), "Song");
});

test("falls back to the track when a custom template renders empty", () => {
  assert.equal(menuTitle(okState, "custom", "{missing}"), "Song");
});

test("returns the music note fallback when artwork-only mode has no artwork", () => {
  assert.equal(menuTitle({ ...okState, artworkUrl: "" }, "artwork-only", "{track} — {artist}"), "♫");
});

test("hides artwork for track-only mode even when artwork is enabled", async () => {
  const module = (await import("./now-playing-menubar-display")) as {
    shouldShowMenuBarArtwork?: (mode: string, showAlbumArtwork: boolean) => boolean;
  };

  assert.equal(module.shouldShowMenuBarArtwork?.("track-only", true), false);
});

test("shows artwork-only mode even when the artwork preference is disabled", async () => {
  const module = (await import("./now-playing-menubar-display")) as {
    shouldShowMenuBarArtwork?: (mode: string, showAlbumArtwork: boolean) => boolean;
  };

  assert.equal(module.shouldShowMenuBarArtwork?.("artwork-only", false), true);
});
