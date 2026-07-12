import { beforeEach, describe, expect, it, vi } from "vitest";

const execSafe = vi.hoisted(() => vi.fn());
vi.mock("../../src/lib/exec", () => ({ execSafe }));
import { resolveAppName } from "../../src/lib/appName";

beforeEach(() => execSafe.mockReset());

describe("resolveAppName", () => {
  it("maps known bundle ids to product names without touching Spotlight", async () => {
    expect(await resolveAppName("com.apple.Music", "Music")).toBe("Apple Music");
    expect(await resolveAppName("com.spotify.client", "x")).toBe("Spotify");
    expect(execSafe).not.toHaveBeenCalled();
  });

  it("resolves an unknown bundle id to the installed app's file name", async () => {
    execSafe.mockResolvedValue(
      "/Users/x/Applications/Chrome Apps.localized/YouTube Music.app",
    );
    expect(
      await resolveAppName("com.google.Chrome.app.abcdef", "abcdef"),
    ).toBe("YouTube Music");
  });

  it("caches per bundle id so Spotlight runs once", async () => {
    execSafe.mockResolvedValue("/Applications/Weird.app");
    await resolveAppName("com.example.cachetest", "fallback");
    await resolveAppName("com.example.cachetest", "fallback");
    expect(execSafe).toHaveBeenCalledTimes(1);
  });

  it("falls back to the given name when Spotlight finds nothing", async () => {
    execSafe.mockResolvedValue(null);
    expect(await resolveAppName("com.example.missing", "Fallback Name")).toBe(
      "Fallback Name",
    );
  });

  it("does not query Spotlight for a malformed bundle id", async () => {
    expect(await resolveAppName("weird id; rm -rf", "Safe")).toBe("Safe");
    expect(execSafe).not.toHaveBeenCalled();
  });

  it("returns the fallback when no bundle id is given", async () => {
    expect(await resolveAppName(undefined, "Nothing")).toBe("Nothing");
    expect(execSafe).not.toHaveBeenCalled();
  });
});
