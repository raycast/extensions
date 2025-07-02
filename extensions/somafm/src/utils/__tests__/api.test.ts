import { describe, it, expect, vi } from "vitest";
import { showFailureToast } from "@raycast/utils";
import { fetchStations } from "../api";

describe("fetchStations", () => {
  it("should fetch and return stations from the API", async () => {
    const mockStations = [
      {
        id: "groovesalad",
        title: "Groove Salad",
        description: "A nicely chilled plate of ambient/downtempo beats",
        dj: "Rusty Hodge",
        genre: "ambient|electronic",
        image: "https://api.somafm.com/img/groovesalad120.png",
        largeimage: "https://api.somafm.com/logos/256/groovesalad256.png",
        xlimage: "https://api.somafm.com/logos/512/groovesalad512.png",
        twitter: "@SomaFM",
        updated: "1234567890",
        playlists: [{ url: "https://api.somafm.com/groovesalad.pls", format: "mp3", quality: "highest" }],
        listeners: "123",
        lastPlaying: "Some Artist - Some Track",
      },
    ];

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ channels: mockStations }),
      } as Response),
    );

    const result = await fetchStations();

    expect(fetch).toHaveBeenCalledWith("https://somafm.com/channels.json");
    expect(result).toEqual(mockStations);
  });

  it("should return empty array and show toast when the API request fails", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response),
    );

    const result = await fetchStations();

    expect(result).toEqual([]);
    expect(showFailureToast).toHaveBeenCalledWith(
      "Failed to fetch stations: Internal Server Error",
      expect.objectContaining({
        title: "Failed to fetch stations",
      }),
    );
  });

  it("should return empty array and show toast when fetch throws", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("Network error")));

    const result = await fetchStations();

    expect(result).toEqual([]);
    expect(showFailureToast).toHaveBeenCalledWith(
      "Network error",
      expect.objectContaining({
        title: "Failed to fetch stations",
      }),
    );
  });
});
