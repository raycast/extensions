import { describe, expect, it } from "vitest";
import { extractBookmarks } from "../../src/utils/bookmarks";

function urlNode(overrides: Record<string, unknown>) {
  return { type: "url", ...overrides };
}

describe("extractBookmarks", () => {
  it("extracts bookmarks from all roots without treating roots as folders", () => {
    const raw = {
      roots: {
        bookmark_bar: {
          type: "folder",
          name: "Bookmarks bar",
          children: [urlNode({ guid: "guid-1", name: "Gmail", url: "https://mail.google.com" })],
        },
        other: {
          type: "folder",
          name: "Other bookmarks",
          children: [urlNode({ guid: "guid-2", name: "Docs", url: "https://docs.example.com" })],
        },
      },
    };

    expect(extractBookmarks(raw)).toEqual([
      { id: "guid-1", title: "Gmail", url: "https://mail.google.com", folder: undefined },
      { id: "guid-2", title: "Docs", url: "https://docs.example.com", folder: undefined },
    ]);
  });

  it("builds folder paths for arbitrarily nested folders", () => {
    const raw = {
      roots: {
        bookmark_bar: {
          type: "folder",
          children: [
            {
              type: "folder",
              name: "Work",
              children: [
                urlNode({ guid: "guid-1", name: "Board", url: "https://board.example.com" }),
                {
                  type: "folder",
                  name: "Infra",
                  children: [
                    {
                      type: "folder",
                      name: "Dashboards",
                      children: [urlNode({ guid: "guid-2", name: "Grafana", url: "https://grafana.example.com" })],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };

    const bookmarks = extractBookmarks(raw);
    expect(bookmarks.map((bookmark) => bookmark.folder)).toEqual(["Work", "Work/Infra/Dashboards"]);
  });

  it("falls back to id, then url, for identity and to Untitled for blank names", () => {
    const raw = {
      roots: {
        bookmark_bar: {
          type: "folder",
          children: [
            urlNode({ id: "42", name: "  ", url: "https://a.example.com" }),
            urlNode({ url: "https://b.example.com", name: "B" }),
          ],
        },
      },
    };

    expect(extractBookmarks(raw)).toEqual([
      { id: "42", title: "Untitled", url: "https://a.example.com", folder: undefined },
      { id: "https://b.example.com", title: "B", url: "https://b.example.com", folder: undefined },
    ]);
  });

  it("ignores malformed input and nodes without URLs", () => {
    expect(extractBookmarks(undefined)).toEqual([]);
    expect(extractBookmarks({})).toEqual([]);
    expect(extractBookmarks({ roots: null })).toEqual([]);
    expect(extractBookmarks({ roots: { bookmark_bar: { type: "folder", children: [{ type: "url" }] } } })).toEqual([]);
  });
});
