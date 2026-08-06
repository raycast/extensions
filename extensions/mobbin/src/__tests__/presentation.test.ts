import { describe, expect, it } from "vitest";
import { MobbinError } from "../lib/errors";
import {
  REFERENCE_GRID_COLUMNS,
  canExcludeFromSearch,
  flowGridAspectRatio,
  oauthActionStatus,
  searchGridAspectRatio,
} from "../lib/presentation";

describe("presentation decisions", () => {
  it("uses two large reference columns", () => {
    expect(REFERENCE_GRID_COLUMNS).toBe(2);
  });

  it("uses portrait iOS screens and landscape web/section grids", () => {
    expect(searchGridAspectRatio("screen", "ios")).toBe("9/16");
    expect(searchGridAspectRatio("screen", "web")).toBe("16/9");
    expect(searchGridAspectRatio("section", "ios")).toBe("16/9");
  });

  it("prefers retained flow image dimensions", () => {
    expect(
      flowGridAspectRatio({
        platform: "ios",
        coverImage: { width: 1200, height: 800 },
        screens: [],
      }),
    ).toBe("16/9");
    expect(
      flowGridAspectRatio({
        platform: "web",
        screens: [{ image: { width: 390, height: 844 } }],
      }),
    ).toBe("9/16");
  });

  it("only allows exclusions for active screen results", () => {
    expect(canExcludeFromSearch("screen", "login")).toBe(true);
    expect(canExcludeFromSearch("screen", "  ")).toBe(false);
    expect(canExcludeFromSearch("flow", "login")).toBe(false);
  });

  it("offers reconnect after a broken authenticated transport", () => {
    expect(
      oauthActionStatus(
        "connected",
        new MobbinError("transport failed", "mcp-error"),
      ),
    ).toBe("expired");
    expect(oauthActionStatus("disconnected", undefined)).toBe("disconnected");
  });
});
