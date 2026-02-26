import { Album, Artist } from "@/music-assistant/external-code/interfaces";
import { getBreadcrumb, getBrowseSubtitle, getRecentlyPlayedIcon } from "@/music-library-hub/helpers";
import { BreadcrumbState } from "@/music-library-hub/types";

jest.mock("@raycast/api");

describe("music-library-hub helpers", () => {
  it("builds breadcrumb from available entities", () => {
    const state: BreadcrumbState = {
      view: "album-detail",
      artist: { name: "Artist A" } as unknown as Artist,
      album: { name: "Album B" } as unknown as Album,
    };

    expect(getBreadcrumb(state)).toBe("Artist A > Album B");
  });

  it("returns browse subtitle for top-level views and breadcrumb for detail views", () => {
    expect(getBrowseSubtitle("artists")).toBe("Artists");
    expect(getBrowseSubtitle("albums")).toBe("Albums");
    expect(getBrowseSubtitle("playlists")).toBe("Playlists");
    expect(getBrowseSubtitle("album-detail", "Artist > Album")).toBe("Artist > Album");
  });

  it("maps recently played uri to icon categories", () => {
    expect(getRecentlyPlayedIcon("library://artist/123").source).toBe("person");
    expect(getRecentlyPlayedIcon("library://album/123").source).toBe("music");
    expect(getRecentlyPlayedIcon("library://playlist/123").source).toBe("layers");
    expect(getRecentlyPlayedIcon("library://track/123").source).toBe("terminal");
  });
});
