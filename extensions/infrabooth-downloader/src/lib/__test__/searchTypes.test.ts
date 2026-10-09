import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({ Icon: { Music: "music", List: "list", Shuffle: "shuffle", Globe: "globe" } }));

import { filterResults, nextSearchType, SEARCH_TYPE_ORDER, type Results } from "../searchTypes";

describe("searchTypes", () => {
  it("orders the online type last", () => {
    expect(SEARCH_TYPE_ORDER).toEqual(["tracks", "playlists", "mixes", "online"]);
  });

  it("cycles search types", () => {
    expect(nextSearchType("tracks")).toBe("playlists");
    expect(nextSearchType("mixes")).toBe("online");
    expect(nextSearchType("online")).toBe("tracks");
  });

  it("filters mixes case-insensitively by title", () => {
    const results: Results = {
      kind: "mixes",
      mixes: [
        { id: "1", title: "Your Mix 1", artworkUrl: null, tracks: [] },
        { id: "2", title: "Other", artworkUrl: null, tracks: [] },
      ],
    };
    expect(filterResults(results, "your mix")).toEqual({ kind: "mixes", mixes: [results.mixes[0]] });
    expect(filterResults(results, "")).toBe(results);
  });
});
