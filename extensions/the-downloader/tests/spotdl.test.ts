import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));

vi.mock("../src/lib/spotdl-cache.js", () => ({
  invalidateSpotipyCacheIfStale: vi.fn(),
}));

import { spawn } from "node:child_process";
import { invalidateSpotipyCacheIfStale } from "../src/lib/spotdl-cache.js";
import { buildSpotdlArgs, runSpotdlDownload, summarizeSpotdlError, SpotdlDownloadError } from "../src/lib/spotdl";

function fakeChild() {
  const child = new EventEmitter() as any;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn(() => child.emit("close", null));
  return child;
}

describe("buildSpotdlArgs", () => {
  it("builds a download command with url, output template, format and ffmpeg path", () => {
    expect(
      buildSpotdlArgs({
        url: "https://open.spotify.com/track/abc",
        destination: "/Downloads",
        format: "mp3",
        ffmpegPath: "/opt/homebrew/bin/ffmpeg",
      }),
    ).toEqual([
      "download",
      "https://open.spotify.com/track/abc",
      "--output",
      "/Downloads/{artists} - {title}.{output-ext}",
      "--format",
      "mp3",
      "--ffmpeg",
      "/opt/homebrew/bin/ffmpeg",
    ]);
  });

  it("wraps the output template in a {list-name}/ folder for playlist URLs", () => {
    const args = buildSpotdlArgs({
      url: "https://open.spotify.com/playlist/30Gyf3ILlOAOGxFeK6xWew",
      destination: "/Downloads",
      format: "mp3",
      ffmpegPath: "/ff",
    });
    const i = args.indexOf("--output");
    expect(i).toBeGreaterThan(-1);
    expect(args[i + 1]).toContain("{list-name}");
    expect(args[i + 1]).toContain("{artists} - {title}.{output-ext}");
  });

  it("also wraps playlist Spotify URIs", () => {
    const args = buildSpotdlArgs({
      url: "spotify:playlist:30Gyf3ILlOAOGxFeK6xWew",
      destination: "/d",
      format: "mp3",
      ffmpegPath: "/ff",
    });
    const i = args.indexOf("--output");
    expect(args[i + 1]).toContain("{list-name}");
  });

  it("also wraps localized open.spotify.com playlist URLs", () => {
    // e.g. /cs/playlist/... when opened from Czech account
    const args = buildSpotdlArgs({
      url: "https://open.spotify.com/cs/playlist/30Gyf3ILlOAOGxFeK6xWew",
      destination: "/d",
      format: "mp3",
      ffmpegPath: "/ff",
    });
    const i = args.indexOf("--output");
    expect(args[i + 1]).toContain("{list-name}");
  });

  it("does NOT wrap track or album URLs in a {list-name}/ folder", () => {
    for (const url of [
      "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
      "https://open.spotify.com/album/30Gyf3ILlOAOGxFeK6xWew",
      "spotify:track:4uLU6hMCjMI75M1A2tKUQC",
    ]) {
      const args = buildSpotdlArgs({
        url,
        destination: "/d",
        format: "mp3",
        ffmpegPath: "/ff",
      });
      const i = args.indexOf("--output");
      expect(args[i + 1]).not.toContain("{list-name}");
    }
  });

  it("passes the chosen audio format through", () => {
    expect(
      buildSpotdlArgs({
        url: "https://open.spotify.com/track/x",
        destination: "/d",
        format: "flac",
        ffmpegPath: "/ff",
      }),
    ).toContain("flac");
  });

  it("appends --client-id, --client-secret and --use-official-api when both creds are provided", () => {
    const args = buildSpotdlArgs({
      url: "https://open.spotify.com/track/x",
      destination: "/d",
      format: "mp3",
      ffmpegPath: "/ff",
      clientId: "id123",
      clientSecret: "secretXYZ",
    });
    expect(args).toContain("--client-id");
    expect(args).toContain("id123");
    expect(args).toContain("--client-secret");
    expect(args).toContain("secretXYZ");
    // --use-official-api is what actually bypasses the broken librespot path;
    // without it, the credentials alone are not enough.
    expect(args).toContain("--use-official-api");
  });

  it("appends --user-auth when userAuth is true and credentials are provided", () => {
    const args = buildSpotdlArgs({
      url: "https://open.spotify.com/playlist/x",
      destination: "/d",
      format: "mp3",
      ffmpegPath: "/ff",
      clientId: "id",
      clientSecret: "secret",
      userAuth: true,
    });
    expect(args).toContain("--user-auth");
  });

  it("omits --user-auth when userAuth is true but credentials are missing", () => {
    // --user-auth alone is useless without a Dev app to authenticate against,
    // so the flag should not leak through when credentials aren't set.
    const args = buildSpotdlArgs({
      url: "https://open.spotify.com/playlist/x",
      destination: "/d",
      format: "mp3",
      ffmpegPath: "/ff",
      userAuth: true,
    });
    expect(args).not.toContain("--user-auth");
  });

  it("omits --user-auth when userAuth is false or undefined, even with credentials", () => {
    for (const userAuth of [false, undefined]) {
      const args = buildSpotdlArgs({
        url: "https://open.spotify.com/track/x",
        destination: "/d",
        format: "mp3",
        ffmpegPath: "/ff",
        clientId: "id",
        clientSecret: "secret",
        userAuth,
      });
      expect(args).not.toContain("--user-auth");
    }
  });

  it("omits --client-id, --client-secret and --use-official-api when missing, empty, or whitespace", () => {
    const baseline = {
      url: "https://open.spotify.com/track/x",
      destination: "/d",
      format: "mp3",
      ffmpegPath: "/ff",
    };
    for (const variant of [
      baseline,
      { ...baseline, clientId: "", clientSecret: "" },
      { ...baseline, clientId: "  ", clientSecret: "  " },
      { ...baseline, clientId: "id-only", clientSecret: "" },
      { ...baseline, clientId: "", clientSecret: "secret-only" },
    ]) {
      const args = buildSpotdlArgs(variant);
      expect(args).not.toContain("--client-id");
      expect(args).not.toContain("--client-secret");
      expect(args).not.toContain("--use-official-api");
    }
  });
});

describe("runSpotdlDownload", () => {
  it("resolves with the track count and calls onProgress as tracks complete", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const onProgress = vi.fn();
    const promise = runSpotdlDownload(
      "/support/spotdl",
      { url: "https://open.spotify.com/playlist/x", destination: "/tmp", format: "mp3", ffmpegPath: "/ff" },
      onProgress,
    );

    child.stdout.emit("data", Buffer.from('Downloaded "A - 1"\nDownloaded "A - 2"\n'));
    child.emit("close", 0);

    await expect(promise).resolves.toEqual({ tracks: 2 });
    expect(onProgress).toHaveBeenCalled();
  });

  it("rejects with the stderr text on a non-zero exit", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const promise = runSpotdlDownload(
      "/support/spotdl",
      { url: "https://open.spotify.com/track/bad", destination: "/tmp", format: "mp3", ffmpegPath: "/ff" },
      vi.fn(),
    );

    child.stderr.emit("data", Buffer.from("AudioProviderError"));
    child.emit("close", 1);

    await expect(promise).rejects.toThrow("AudioProviderError");
  });

  it("rejects with a SpotdlDownloadError carrying tracks downloaded before failure", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const promise = runSpotdlDownload(
      "/support/spotdl",
      { url: "https://open.spotify.com/playlist/x", destination: "/tmp", format: "mp3", ffmpegPath: "/ff" },
      vi.fn(),
    );

    child.stdout.emit("data", Buffer.from('Downloaded "A - 1"\nDownloaded "A - 2"\nDownloaded "A - 3"\n'));
    child.stdout.emit("data", Buffer.from("HTTP Error for GET /v1/playlists/x/items returned 403 due to Forbidden\n"));
    child.emit("close", 1);

    await expect(promise).rejects.toBeInstanceOf(SpotdlDownloadError);
    try {
      await promise;
    } catch (e) {
      const err = e as SpotdlDownloadError;
      expect(err.tracks).toBe(3);
      expect(err.rawOutput).toContain("403");
    }
  });

  it("rejects with a watchdog error when spotdl produces no output for the idle window", async () => {
    // Mirrors the silent --user-auth hang we saw on Windows: spotdl prints
    // "Processing query: ..." and then blocks forever waiting on an OAuth
    // callback that never arrives. Without a watchdog the extension toast
    // stays animated indefinitely and child processes pile up as zombies.
    vi.useFakeTimers();
    try {
      const child = fakeChild();
      (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

      const promise = runSpotdlDownload(
        "/support/spotdl",
        { url: "https://open.spotify.com/track/x", destination: "/tmp", format: "mp3", ffmpegPath: "/ff" },
        vi.fn(),
      );
      // Attach the assertion before advancing time so the rejection always has
      // a handler — fake-timer ordering otherwise produces a spurious
      // unhandled-rejection warning.
      const assertion = expect(promise).rejects.toThrow(/stuck|no output|2 minutes/i);

      child.stdout.emit("data", Buffer.from("Processing query: ...\n"));
      await vi.advanceTimersByTimeAsync(125_000);

      await assertion;
      expect(child.kill).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("invalidates the spotipy cache before spawn when supportDir + credentials are provided", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);
    vi.mocked(invalidateSpotipyCacheIfStale).mockClear();

    const promise = runSpotdlDownload(
      "/support/spotdl",
      {
        url: "https://open.spotify.com/track/x",
        destination: "/tmp",
        format: "mp3",
        ffmpegPath: "/ff",
        clientId: "id",
        clientSecret: "secret",
        userAuth: true,
        supportDir: "/support",
      },
      vi.fn(),
    );

    expect(invalidateSpotipyCacheIfStale).toHaveBeenCalledWith("/support", "id", "secret", true);

    child.emit("close", 0);
    await promise;
  });

  it("does NOT touch the spotipy cache when supportDir is omitted", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);
    vi.mocked(invalidateSpotipyCacheIfStale).mockClear();

    const promise = runSpotdlDownload(
      "/support/spotdl",
      { url: "https://open.spotify.com/track/x", destination: "/tmp", format: "mp3", ffmpegPath: "/ff" },
      vi.fn(),
    );

    expect(invalidateSpotipyCacheIfStale).not.toHaveBeenCalled();

    child.emit("close", 0);
    await promise;
  });

  it("falls back to stdout when stderr is empty on a non-zero exit", async () => {
    // spotDL is Python+Rich-based and routinely prints tracebacks/errors to
    // stdout, not stderr. Without this fallback the user just sees the bare
    // exit code and has nothing to act on.
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const promise = runSpotdlDownload(
      "/support/spotdl",
      { url: "https://open.spotify.com/track/bad", destination: "/tmp", format: "mp3", ffmpegPath: "/ff" },
      vi.fn(),
    );

    child.stdout.emit("data", Buffer.from("LookupError: Could not find any results for the query\n"));
    child.emit("close", 1);

    await expect(promise).rejects.toThrow("Could not find any results for the query");
  });

  it("rejects immediately with AbortError when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      runSpotdlDownload(
        "/support/spotdl",
        {
          url: "https://open.spotify.com/track/x",
          destination: "/tmp",
          format: "mp3",
          ffmpegPath: "/ff",
          abortSignal: controller.signal,
        },
        vi.fn(),
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("kills spotdl and rejects with AbortError when the signal aborts mid-download (user pressed Stop)", async () => {
    const controller = new AbortController();
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const promise = runSpotdlDownload(
      "/support/spotdl",
      {
        url: "https://open.spotify.com/playlist/x",
        destination: "/tmp",
        format: "mp3",
        ffmpegPath: "/ff",
        abortSignal: controller.signal,
      },
      vi.fn(),
    );
    const assertion = expect(promise).rejects.toMatchObject({ name: "AbortError" });

    child.stdout.emit("data", Buffer.from('Downloaded "A - 1"\n'));
    controller.abort();

    await assertion;
    expect(child.kill).toHaveBeenCalled();
  });
});

describe("summarizeSpotdlError", () => {
  it("maps 403 Forbidden to a private-playlist explanation", () => {
    const s = summarizeSpotdlError("HTTP Error for GET /v1/playlists/x/items returned 403 due to Forbidden");
    expect(s.title.toLowerCase()).toContain("forbidden");
    expect(s.message.toLowerCase()).toContain("private");
    expect(s.action).toBe("open-setup-guide");
  });

  it("maps 404 Not Found to an enable-user-auth hint", () => {
    const s = summarizeSpotdlError("HTTP Error for GET /v1/playlists/x/items returned 404");
    expect(s.title.toLowerCase()).toMatch(/not found|404/);
    expect(s.message.toLowerCase()).toMatch(/user authentication|user-auth|private/);
    expect(s.action).toBe("open-setup-guide");
  });

  it("maps 'Could not get session auth tokens' to a missing-credentials hint", () => {
    const s = summarizeSpotdlError("BaseClientError: Could not get session auth tokens");
    expect(s.message.toLowerCase()).toMatch(/client id|client secret|credentials/);
    expect(s.action).toBe("open-preferences");
  });

  it("maps 'redirect_uri Not matching' to a Dev-app config hint", () => {
    const s = summarizeSpotdlError("INVALID_CLIENT: redirect_uri: Not matching configuration");
    expect(s.message.toLowerCase()).toMatch(/redirect uri|127\.0\.0\.1:9900/);
    expect(s.action).toBe("open-setup-guide");
  });

  it("maps 'Bad CPU type in executable' to a Rosetta install hint", () => {
    // The x86_64-only spotDL prebuilt binary triggers this on Apple Silicon
    // without Rosetta — surface the actual fix, not just the raw shell error.
    const s = summarizeSpotdlError("zsh: bad CPU type in executable: /Users/x/.../spotdl");
    expect(s.title.toLowerCase()).toContain("rosetta");
    expect(s.message.toLowerCase()).toMatch(/softwareupdate.*--install-rosetta/);
  });

  it("maps ENOEXEC / 'cannot execute binary file' to the same Rosetta hint", () => {
    for (const raw of ["spawn ENOEXEC", "bash: ./spotdl: cannot execute binary file: Exec format error"]) {
      const s = summarizeSpotdlError(raw);
      expect(s.title.toLowerCase()).toContain("rosetta");
    }
  });

  it("maps Python KeyError/AttributeError/TypeError tracebacks to a 'spotDL upstream bug' summary", () => {
    for (const raw of [
      "Processing query: https://open.spotify.com/album/abc\n\nAn error occurred\n+-- Traceback --+\n| in get_metadata:100\n+----+\nKeyError: 'label'",
      "Traceback (most recent call last)\nAttributeError: 'NoneType' object has no attribute 'name'",
      "TypeError: 'NoneType' object is not subscriptable",
      "IndexError: list index out of range",
    ]) {
      const s = summarizeSpotdlError(raw);
      expect(s.title.toLowerCase()).toMatch(/spotdl|upstream|bug/);
      // The specific Python exception should appear in the user-facing message
      // so the toast is actionable (not just "something broke").
      expect(s.message).toMatch(/KeyError|AttributeError|TypeError|IndexError/);
    }
  });

  it("falls back to the last non-empty line for unknown errors", () => {
    const s = summarizeSpotdlError(
      "Some leading noise\n\n+----- traceback -----+\nFooError: something specific went wrong\n",
    );
    expect(s.message).toContain("something specific went wrong");
    // No specific action for unknown errors.
    expect(s.action).toBeUndefined();
  });

  it("handles empty/whitespace output without crashing", () => {
    const s = summarizeSpotdlError("   \n  \n");
    expect(s.title).toBeTruthy();
    expect(s.message).toBeTruthy();
  });
});
