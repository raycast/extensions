import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/applescript", () => ({ runAppleScript: vi.fn() }));
import { runAppleScript } from "../../src/lib/applescript";
import { chromeProvider, parseYouTubeTitle, safariProvider } from "../../src/providers/browser";

beforeEach(() => vi.mocked(runAppleScript).mockReset());

describe("parseYouTubeTitle", () => {
  it("strips suffix and splits artist", () => {
    expect(parseYouTubeTitle("Daft Punk - Around the World - YouTube")).toEqual({
      artist: "Daft Punk",
      title: "Around the World",
    });
  });
  it("strips notification prefix", () => {
    expect(parseYouTubeTitle("(3) Lo-fi beats - YouTube")).toEqual({ title: "Lo-fi beats" });
  });
  it("null for empty", () => expect(parseYouTubeTitle(" - YouTube")).toBeNull());
});

describe("safariProvider.getSource", () => {
  it("returns source for youtube watch tab", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("Song - YouTube|https://www.youtube.com/watch?v=x");
    const s = await safariProvider.getSource();
    expect(s).toMatchObject({ appName: "Safari", title: "Song", origin: "browser", url: "https://www.youtube.com/watch?v=x" });
  });
  it("null for non-player tab", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("GitHub|https://github.com");
    expect(await safariProvider.getSource()).toBeNull();
  });
  it("null on script failure", async () => {
    vi.mocked(runAppleScript).mockResolvedValue(null);
    expect(await safariProvider.getSource()).toBeNull();
  });
});

describe("chromeProvider", () => {
  it("uses chrome applescript", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("Song - YouTube|https://music.youtube.com/watch?v=y");
    const s = await chromeProvider.getSource();
    expect(s?.appName).toBe("Chrome");
  });
});

describe("edge cases", () => {
  it("splits URL on the last pipe when title contains pipes", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("A|B - YouTube|https://www.youtube.com/watch?v=z");
    const s = await safariProvider.getSource();
    expect(s).toMatchObject({ title: "A|B", url: "https://www.youtube.com/watch?v=z" });
  });

  it("uses raw title for non-youtube allowlisted domains (spotify)", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("Some Track|https://open.spotify.com/track/abc");
    const s = await safariProvider.getSource();
    expect(s).toMatchObject({ title: "Some Track", url: "https://open.spotify.com/track/abc" });
  });

  it("uses raw title for soundcloud", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("A Mix|https://soundcloud.com/artist/a-mix");
    const s = await safariProvider.getSource();
    expect(s).toMatchObject({ title: "A Mix", url: "https://soundcloud.com/artist/a-mix" });
  });

  it("parses title/artist for a music.youtube.com tab end-to-end", async () => {
    vi.mocked(runAppleScript).mockResolvedValue(
      "Daft Punk - Around the World - YouTube|https://music.youtube.com/watch?v=y",
    );
    const s = await chromeProvider.getSource();
    expect(s).toMatchObject({
      appName: "Chrome",
      artist: "Daft Punk",
      title: "Around the World",
      url: "https://music.youtube.com/watch?v=y",
    });
  });

  it("null for hostname-spoofing URL with youtube.com in the path", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("Watch - YouTube|https://evil.com/youtube.com/watch");
    expect(await safariProvider.getSource()).toBeNull();
  });

  it("null for URL with allowlisted domain only in the query string", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("foo|https://github.com/foo?ref=open.spotify.com");
    expect(await safariProvider.getSource()).toBeNull();
  });

  it("null for an unparseable URL", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("Song - YouTube|not a url");
    expect(await safariProvider.getSource()).toBeNull();
  });

  it("trims raw title on non-youtube domains", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("  Some Track  |https://open.spotify.com/track/abc");
    const s = await safariProvider.getSource();
    expect(s?.title).toBe("Some Track");
  });

  it("null when non-youtube tab has empty title", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("|https://open.spotify.com/track/abc");
    expect(await safariProvider.getSource()).toBeNull();
  });

  it("isPlaying is always false", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("Song - YouTube|https://www.youtube.com/watch?v=x");
    const s = await safariProvider.getSource();
    expect(s?.isPlaying).toBe(false);
  });

  it("has no control method and correct capabilities", () => {
    expect(safariProvider.control).toBeUndefined();
    expect(safariProvider.capabilities).toEqual({ control: false, artwork: false, seek: false });
    expect(chromeProvider.control).toBeUndefined();
    expect(chromeProvider.capabilities).toEqual({ control: false, artwork: false, seek: false });
  });

  it("checks System Events process name for availability", async () => {
    vi.mocked(runAppleScript).mockResolvedValue("true");
    expect(await safariProvider.isAvailable()).toBe(true);
    expect(runAppleScript).toHaveBeenCalledWith(expect.stringContaining("Safari"));

    vi.mocked(runAppleScript).mockResolvedValue("true");
    expect(await chromeProvider.isAvailable()).toBe(true);
    expect(runAppleScript).toHaveBeenCalledWith(expect.stringContaining("Google Chrome"));
  });

  it("safariProvider ids and bundleId are set correctly", () => {
    expect(safariProvider.id).toBe("browser-safari");
    expect(safariProvider.bundleIds).toContain("com.apple.Safari");
  });

  it("chromeProvider ids and bundleId are set correctly", () => {
    expect(chromeProvider.id).toBe("browser-chrome");
    expect(chromeProvider.bundleIds).toContain("com.google.Chrome");
  });
});
