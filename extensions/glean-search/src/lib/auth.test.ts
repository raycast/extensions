vi.mock("@raycast/api");
vi.mock("child_process");
vi.mock("fs");
vi.mock("path", () => ({
  join: vi.fn((...args) => args.join("/")),
}));
vi.mock("os", () => ({
  homedir: vi.fn(() => "/Users/test"),
}));

import { readFileSync } from "fs";
import { execFile, spawn, _emitChildEvent, _resetChildHandlers } from "child_process";
import { open } from "@raycast/api";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readGleanConfigServerUrl, checkGleanAuth, signInToGlean } from "./auth";

beforeEach(() => {
  _resetChildHandlers();
  vi.clearAllMocks();
});

// ── readGleanConfigServerUrl ──────────────────────────────────────────────

describe("readGleanConfigServerUrl", () => {
  it("returns server_url from valid config", () => {
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ server_url: "https://glean.example.com" }));

    const result = readGleanConfigServerUrl();
    expect(result).toBe("https://glean.example.com");
  });

  it("returns null when config file is missing", () => {
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const result = readGleanConfigServerUrl();
    expect(result).toBeNull();
  });

  it("returns null when server_url is empty", () => {
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ server_url: "" }));

    const result = readGleanConfigServerUrl();
    expect(result).toBeNull();
  });
});

// ── checkGleanAuth ───────────────────────────────────────────────────────

describe("checkGleanAuth", () => {
  it("returns authenticated state when CLI reports success", async () => {
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const cb = callback as (...args: unknown[]) => void;
      cb(null, "✓ Authenticated as user@co.com (https://glean.example.com)", "");
    });

    const result = await checkGleanAuth("/path/to/glean");
    expect(result).toMatchObject({
      state: "authenticated",
      user: "user@co.com",
      host: "https://glean.example.com",
    });
  });

  it("returns unauthenticated state from stderr", async () => {
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const err = new Error("not authenticated") as Error & { stderr?: string; stdout?: string };
      err.stderr = "not authenticated";
      err.stdout = "";
      const cb = callback as (...args: unknown[]) => void;
      cb(err);
    });

    const result = await checkGleanAuth("/path/to/glean");
    expect(result).toMatchObject({ state: "unauthenticated" });
  });

  it("returns error state for non-auth errors", async () => {
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const err = new Error("network error") as Error & { stderr?: string; stdout?: string };
      err.stderr = "network error";
      err.stdout = "";
      const cb = callback as (...args: unknown[]) => void;
      cb(err);
    });

    const result = await checkGleanAuth("/path/to/glean");
    expect(result).toMatchObject({ state: "error", error: "network error" });
  });

  it("returns unauthenticated state when stdout cannot be parsed", async () => {
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const cb = callback as (...args: unknown[]) => void;
      cb(null, "Could not parse auth status", "");
    });

    const result = await checkGleanAuth("/path/to/glean");
    expect(result).toMatchObject({ state: "unauthenticated", error: "Could not parse auth status" });
  });

  it("returns error state when stdout contains Not configured.", async () => {
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const err = new Error("Command failed") as Error & { stdout?: string; stderr?: string };
      err.stdout = "Not configured.";
      err.stderr = "";
      const cb = callback as (...args: unknown[]) => void;
      cb(err);
    });

    const result = await checkGleanAuth("/path/to/glean");
    expect(result).toMatchObject({ state: "error", error: "Not configured." });
  });
});

// ── signInToGlean ────────────────────────────────────────────────────────

describe("signInToGlean", () => {
  it("spawns with GLEAN_SERVER_URL when config has server_url", async () => {
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ server_url: "https://glean.example.com" }));

    const resultPromise = signInToGlean("/path/to/glean");

    expect(vi.mocked(spawn)).toHaveBeenCalledWith(
      "/path/to/glean",
      ["auth", "login"],
      expect.objectContaining({
        stdio: ["ignore", "pipe", "pipe"],
        env: expect.objectContaining({ GLEAN_SERVER_URL: "https://glean.example.com" }),
      }),
    );

    _emitChildEvent("close", 0);
    const result = await resultPromise;
    expect(result).toEqual({ success: true, message: "Signed in successfully" });
  });

  it("writes email to stdin when no config and email provided", async () => {
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const email = "user@co.com";
    const resultPromise = signInToGlean("/path/to/glean", email);

    expect(vi.mocked(spawn)).toHaveBeenCalledWith(
      "/path/to/glean",
      ["auth", "login"],
      expect.objectContaining({
        stdio: ["pipe", "pipe", "pipe"],
      }),
    );

    const child = vi.mocked(spawn).mock.results[0].value;
    expect(child.stdin.write).toHaveBeenCalledWith(`${email}\n`);
    expect(child.stdin.end).toHaveBeenCalled();

    _emitChildEvent("close", 0);
    const result = await resultPromise;
    expect(result).toEqual({ success: true, message: "Signed in successfully" });
  });

  it("times out after 60 seconds and calls child.kill", async () => {
    vi.useFakeTimers();

    try {
      const resultPromise = signInToGlean("/path/to/glean");

      vi.advanceTimersByTime(60000);

      const child = vi.mocked(spawn).mock.results[0].value;
      expect(child.kill).toHaveBeenCalled();

      const result = await resultPromise;
      expect(result).toEqual({
        success: false,
        message: "Sign in timed out. Please try again.",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns failure with output when process exits with code 1", async () => {
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const resultPromise = signInToGlean("/path/to/glean");

    const child = vi.mocked(spawn).mock.results[0].value;
    child.stdout._emit("data", Buffer.from("some output"));

    _emitChildEvent("close", 1);

    const result = await resultPromise;
    expect(result).toEqual({ success: false, message: "some output" });
  });

  it("returns failure with error message when spawn errors", async () => {
    const resultPromise = signInToGlean("/path/to/glean");

    _emitChildEvent("error", new Error("spawn failed"));

    const result = await resultPromise;
    expect(result).toEqual({ success: false, message: "spawn failed" });
  });

  it("extracts OAuth URL from stdout and calls open", async () => {
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ server_url: "https://glean.example.com" }));

    const resultPromise = signInToGlean("/path/to/glean");

    const child = vi.mocked(spawn).mock.results[0].value;
    child.stdout._emit(
      "data",
      Buffer.from(
        "Opening your browser...\nIf your browser doesn't open, visit:\n  https://glean.example.com/oauth/authorize?client_id=abc&redirect_uri=http://localhost\n",
      ),
    );

    _emitChildEvent("close", 0);
    await resultPromise;

    expect(vi.mocked(open)).toHaveBeenCalledWith(
      "https://glean.example.com/oauth/authorize?client_id=abc&redirect_uri=http://localhost",
    );
  });
});
