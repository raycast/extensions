import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, discoveryFilePath, handleStreamLine, searchAlbums, searchPlaylists, searchTracks } from "../api";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async () => JSON.stringify({ port: 4321, token: "tok" })),
}));

describe("discoveryFilePath", () => {
  it("uses Application Support on macOS", () => {
    expect(discoveryFilePath("darwin", "/Users/me", undefined)).toBe(
      "/Users/me/Library/Application Support/com.infrabooth.downloader/raycast.json",
    );
  });

  it("uses APPDATA on Windows", () => {
    expect(discoveryFilePath("win32", "C:\\Users\\me", "C:\\Users\\me\\AppData\\Roaming")).toBe(
      "C:\\Users\\me\\AppData\\Roaming\\com.infrabooth.downloader\\raycast.json",
    );
  });

  it("falls back to the roaming profile folder when APPDATA is unset", () => {
    expect(discoveryFilePath("win32", "C:\\Users\\me", undefined)).toBe(
      "C:\\Users\\me\\AppData\\Roaming\\com.infrabooth.downloader\\raycast.json",
    );
  });
});

describe("handleStreamLine", () => {
  it("forwards batch items without completing", () => {
    const onBatch = vi.fn();
    expect(handleStreamLine("/api/x", '{"type":"batch","items":[1,2]}', onBatch)).toBeUndefined();
    expect(onBatch).toHaveBeenCalledWith([1, 2]);
  });

  it("returns the full list on done", () => {
    expect(handleStreamLine("/api/x", '{"type":"done","items":[3]}', vi.fn())).toEqual([3]);
  });

  it("throws an ApiError carrying the backend message on error", () => {
    const run = () => handleStreamLine("/api/x", '{"type":"error","message":"rate limited"}', vi.fn());
    expect(run).toThrow(ApiError);
    expect(run).toThrow("/api/x failed: rate limited");
  });
});

describe("ApiError detail", () => {
  it("exposes the backend detail separately from the message", () => {
    const error = new ApiError("/api/resolve-link", 400, "Not a SoundCloud URL");
    expect(error.detail).toBe("Not a SoundCloud URL");
    expect(error.message).toBe("/api/resolve-link failed: Not a SoundCloud URL");
  });
});

describe("search page params", () => {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response("[]", { status: 200 }));

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function requestedUrl(): URL {
    return new URL(String(fetchMock.mock.calls[0][0]));
  }

  it("forwards limit and offset as query params", async () => {
    await searchTracks("house", { limit: 10, offset: 20 });
    const url = requestedUrl();
    expect(url.pathname).toBe("/api/search");
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: "house", limit: "10", offset: "20", token: "tok" });
  });

  it("omits paging params when no page is given", async () => {
    await searchPlaylists("house");
    const url = requestedUrl();
    expect(url.pathname).toBe("/api/search-playlists");
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: "house", token: "tok" });
  });

  it("searches albums on the albums route", async () => {
    await searchAlbums("house", { limit: 20, offset: 40 });
    const url = requestedUrl();
    expect(url.pathname).toBe("/api/search-albums");
    expect(url.searchParams.get("offset")).toBe("40");
  });
});
