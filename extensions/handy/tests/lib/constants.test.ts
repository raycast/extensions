import { describe, expect, it } from "vitest";
import { getHandySupportDir } from "../../src/lib/constants";

describe("getHandySupportDir", () => {
  it("uses Application Support on macOS", () => {
    expect(getHandySupportDir("darwin", {}, "/Users/me")).toBe(
      "/Users/me/Library/Application Support/com.pais.handy",
    );
  });

  it("uses XDG_DATA_HOME on Linux", () => {
    expect(
      getHandySupportDir("linux", { XDG_DATA_HOME: "/data" }, "/home/me"),
    ).toBe("/data/com.pais.handy");
  });

  it.each([undefined, "", "relative/path"])(
    "falls back to ~/.local/share when XDG_DATA_HOME is %s",
    (xdgDataHome) => {
      expect(
        getHandySupportDir("linux", { XDG_DATA_HOME: xdgDataHome }, "/home/me"),
      ).toBe("/home/me/.local/share/com.pais.handy");
    },
  );
});
