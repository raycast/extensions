import { describe, expect, it } from "vitest";
import {
  parseAcknowledgement,
  parseChromiumDataDirectoryResponse,
  parseSpacesResponse,
  parseTabsResponse,
  parseVersionResponse,
} from "../src/types";

const spaceIconData =
  "iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAHElEQVR4nO3BAQEAAACCIP+vbkhAAQAAAAAAfBoZKAABYJ0ZdgAAAABJRU5ErkJggg==";
const lowResolutionSpaceIconData =
  "iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAFUlEQVR4nGNgGAWjYBSMglEwCqgDAAZUAAGDHP/NAAAAAElFTkSuQmCC";

function response(payload: Record<string, unknown>): string {
  return JSON.stringify({ schemaVersion: 1, ok: true, ...payload });
}

describe("Phi response validation", () => {
  it("parses valid Space, tab, and version responses", () => {
    expect(
      parseSpacesResponse(
        response({
          spaces: [
            {
              id: "space-a",
              title: '工作 "A"',
              profileId: "Default",
              profileName: "Personal",
              colorHex: "#123456",
              iconData: spaceIconData,
              isActive: true,
              isOpen: true,
            },
          ],
        }),
      ),
    ).toEqual([
      {
        id: "space-a",
        title: '工作 "A"',
        profileId: "Default",
        profileName: "Personal",
        colorHex: "#123456",
        iconData: spaceIconData,
        isActive: true,
        isOpen: true,
      },
    ]);
    expect(
      parseTabsResponse(
        response({
          tabs: [
            {
              id: "1",
              windowId: "2",
              spaceId: "space-a",
              title: "A \\ path",
              url: null,
              isActive: false,
              isPinned: true,
            },
          ],
          pinnedTabs: [
            {
              id: "pin-a",
              scope: "profile",
              ownerSpaceId: null,
              spaceIds: ["space-a", "space-b"],
              title: "Pinned",
              url: "https://pin.example",
              secondary: null,
            },
          ],
          bookmarks: [
            {
              id: "bookmark-a",
              spaceId: "space-a",
              title: "Bookmark",
              url: "https://bookmark.example",
              secondary: {
                id: "bookmark-a:secondary",
                title: "Secondary",
                url: "https://secondary.example",
              },
            },
          ],
          targetSpaceId: "space-a",
        }),
      ).tabs[0]?.url,
    ).toBeNull();
    expect(
      parseTabsResponse(
        response({
          tabs: [],
          pinnedTabs: [
            {
              id: "pin-a",
              scope: "profile",
              ownerSpaceId: null,
              spaceIds: ["space-a", "space-b"],
              title: "Pinned",
              url: "https://pin.example",
              secondary: null,
            },
          ],
          bookmarks: [],
          targetSpaceId: null,
        }),
      ).pinnedTabs[0]?.spaceIds,
    ).toEqual(["space-a", "space-b"]);
    expect(
      parseVersionResponse(
        response({ apiVersion: 1, version: "1.2.3", build: "456" }),
      ),
    ).toEqual({ apiVersion: 1, version: "1.2.3", build: "456" });
    expect(
      parseChromiumDataDirectoryResponse(
        response({
          chromiumDataDirectory:
            "/Users/test/Library/Application Support/com.phibrowser.Mac",
        }),
      ),
    ).toBe("/Users/test/Library/Application Support/com.phibrowser.Mac");
  });

  it.each([
    ["not JSON", "malformedResponse"],
    [JSON.stringify([]), "malformedResponse"],
    [JSON.stringify({ schemaVersion: 2, ok: true }), "unsupportedVersion"],
    [JSON.stringify({ schemaVersion: 1, spaces: [] }), "malformedResponse"],
  ])("rejects invalid envelope %s", (raw, kind) => {
    expect(() => parseSpacesResponse(raw)).toThrowError(
      expect.objectContaining({ kind }),
    );
  });

  it("rejects missing required fields and non-null non-string URLs", () => {
    expect(() =>
      parseSpacesResponse(response({ spaces: [{ id: "space-a" }] })),
    ).toThrowError(expect.objectContaining({ kind: "malformedResponse" }));
    expect(() =>
      parseTabsResponse(
        response({
          tabs: [
            {
              id: "1",
              windowId: "2",
              spaceId: "space-a",
              title: "Tab",
              url: 42,
              isActive: false,
              isPinned: false,
            },
          ],
          pinnedTabs: [],
          bookmarks: [],
          targetSpaceId: "space-a",
        }),
      ),
    ).toThrowError(expect.objectContaining({ kind: "malformedResponse" }));
  });

  it("rejects a missing or relative Chromium data directory", () => {
    expect(() =>
      parseChromiumDataDirectoryResponse(
        response({ chromiumDataDirectory: "relative/path" }),
      ),
    ).toThrowError(expect.objectContaining({ kind: "malformedResponse" }));
    expect(() =>
      parseChromiumDataDirectoryResponse(response({})),
    ).toThrowError(expect.objectContaining({ kind: "malformedResponse" }));
  });

  it("accepts legacy Spaces without icon data and rejects invalid icons", () => {
    const legacySpace = {
      id: "space-a",
      title: "Work",
      profileId: "Default",
      profileName: "Personal",
      colorHex: "#123456",
      isActive: true,
      isOpen: true,
    };

    expect(
      parseSpacesResponse(response({ spaces: [legacySpace] }))[0]?.iconData,
    ).toBeNull();
    expect(() =>
      parseSpacesResponse(
        response({
          spaces: [{ ...legacySpace, iconData: "not-a-40x40-png" }],
        }),
      ),
    ).toThrowError(expect.objectContaining({ kind: "malformedResponse" }));
    expect(() =>
      parseSpacesResponse(
        response({
          spaces: [{ ...legacySpace, iconData: lowResolutionSpaceIconData }],
        }),
      ),
    ).toThrowError(expect.objectContaining({ kind: "malformedResponse" }));
  });

  it("rejects invalid pinned-tab and bookmark records", () => {
    expect(() =>
      parseTabsResponse(
        response({
          tabs: [],
          pinnedTabs: [
            {
              id: "pin-a",
              scope: "profile",
              ownerSpaceId: null,
              spaceIds: [],
              title: "Pinned",
              url: "https://pin.example",
              secondary: null,
            },
          ],
          bookmarks: [],
          targetSpaceId: null,
        }),
      ),
    ).toThrowError(expect.objectContaining({ kind: "malformedResponse" }));
    expect(() =>
      parseTabsResponse(
        response({
          tabs: [],
          pinnedTabs: [],
          bookmarks: [
            {
              id: "bookmark-a",
              title: "Bookmark",
              url: null,
              secondary: null,
            },
          ],
          targetSpaceId: null,
        }),
      ),
    ).toThrowError(expect.objectContaining({ kind: "malformedResponse" }));
  });

  it.each([
    ["no_windows", "noWindows"],
    ["no_active_window", "noWindows"],
    ["space_not_found", "staleResult"],
    ["tab_not_found", "staleResult"],
    ["invalid_argument", "invalidArgument"],
    ["operation_failed", "operationFailed"],
    ["future_error", "unknown"],
  ])("maps native error %s to %s", (code, kind) => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      ok: false,
      error: { code, message: "Native details are not exposed" },
    });
    expect(() => parseAcknowledgement(raw)).toThrowError(
      expect.objectContaining({ kind }),
    );
  });
});
