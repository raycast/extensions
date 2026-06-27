vi.mock("@raycast/api");
vi.mock("child_process");
vi.mock("fs");
vi.mock("fs/promises");
vi.mock("https", () => {
  const mockGet = vi.fn();
  return { default: { get: mockGet }, get: mockGet };
});
vi.mock("crypto", () => ({
  createHash: vi.fn(),
}));

import {
  accessSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
  createReadStream,
  createWriteStream,
} from "fs";
import { chmod, rename, rm, mkdir } from "fs/promises";
import { execFile } from "child_process";
import { environment, showToast } from "@raycast/api";
import { createHash } from "crypto";
import https from "https";
import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { resolveGleanCli, checkExecutable, clearDownloadError } from "./cli";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shared mutable set of paths where `accessSync` should succeed. */
let execPaths: Set<string>;

beforeEach(() => {
  vi.clearAllMocks();
  environment.supportPath = "/tmp/test-support";
  Object.defineProperty(process, "platform", { value: "darwin" });
  Object.defineProperty(process, "arch", { value: "arm64" });
  vi.stubGlobal("fetch", vi.fn());
  execPaths = new Set(["__throw_by_default__"]);
  (accessSync as Mock).mockImplementation((path: string) => {
    if (execPaths.has(path)) return;
    throw new Error("ENOENT");
  });
});

// ---------------------------------------------------------------------------
// checkExecutable
// ---------------------------------------------------------------------------

describe("checkExecutable", () => {
  it("returns true when file exists and is executable", () => {
    execPaths.add("/some/path");
    expect(checkExecutable("/some/path")).toBe(true);
    expect(accessSync).toHaveBeenCalledWith("/some/path", 1); // constants.X_OK
  });

  it("returns false when file is not found", () => {
    // accessSync throws by default since path not in execPaths
    expect(checkExecutable("/nonexistent")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clearDownloadError
// ---------------------------------------------------------------------------

describe("clearDownloadError", () => {
  it("removes the error marker when it exists", () => {
    clearDownloadError();
    expect(unlinkSync).toHaveBeenCalledWith("/tmp/test-support/.glean-download-error");
  });

  it("does not throw when no marker exists", () => {
    (unlinkSync as Mock).mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(() => clearDownloadError()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// resolveGleanCli
// ---------------------------------------------------------------------------

describe("resolveGleanCli", () => {
  /**
   * Set up default mocks so the download path's dependencies are wired.
   * Individual tests override what they need.
   */
  beforeEach(() => {
    // showToast must return a mutable object for the download path
    (showToast as Mock).mockResolvedValue({
      message: "",
      style: "",
      title: "",
      hide: vi.fn().mockResolvedValue(undefined),
    });

    // Default: execFile rejects (which glean fails)
    (execFile as Mock).mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1] as (...args: unknown[]) => void;
      const err = new Error("not found") as Error & { stderr?: string; stdout?: string };
      err.stderr = "";
      err.stdout = "";
      cb(err);
    });

    // mkdir from fs/promises succeeds
    (mkdir as Mock).mockResolvedValue(undefined);
    (chmod as Mock).mockResolvedValue(undefined);
    (rename as Mock).mockResolvedValue(undefined);
    (rm as Mock).mockResolvedValue(undefined);

    // writeFileSync / mkdirSync succeed
    (writeFileSync as Mock).mockReturnValue(undefined);
    (mkdirSync as Mock).mockReturnValue(undefined);
  });

  // -----------------------------------------------------------------------
  // 2. Cached path found
  // -----------------------------------------------------------------------
  it("returns cached path from cli-info.json when binary is executable", async () => {
    const fakePath = "/tmp/fake-glean-path";
    (readFileSync as Mock).mockReturnValue(JSON.stringify({ path: fakePath, version: "1.0.0", source: "preference" }));
    execPaths.add(fakePath);

    const result = await resolveGleanCli();
    expect(result).toBe(fakePath);
  });

  // -----------------------------------------------------------------------
  // 3. Cached download binary found
  // -----------------------------------------------------------------------
  it("returns cached download binary when cli-info.json is absent", async () => {
    // readFileSync returns undefined -> JSON.parse throws -> cached is null
    // execPaths has no paths set, so accessSync throws for all checks
    // BUT accessSync throws by default — we need it to succeed for cachedBinPath
    execPaths.add("/tmp/test-support/glean");

    const result = await resolveGleanCli();
    expect(result).toBe("/tmp/test-support/glean");
    // Should have written a cache entry for the cached bin
    expect(writeFileSync).toHaveBeenCalledWith(
      "/tmp/test-support/cli-info.json",
      expect.stringContaining("/tmp/test-support/glean"),
    );
  });

  // -----------------------------------------------------------------------
  // 4. Homebrew path found
  // -----------------------------------------------------------------------
  it("returns Homebrew path when cached paths are missing", async () => {
    // cached bin fails (not in execPaths), first Homebrew path succeeds
    execPaths.add("/opt/homebrew/bin/glean");

    const result = await resolveGleanCli();
    expect(result).toBe("/opt/homebrew/bin/glean");
  });

  // -----------------------------------------------------------------------
  // 5. which glean succeeds
  // -----------------------------------------------------------------------
  it("returns path from which glean when known paths fail", async () => {
    const whichPath = "/custom/prefix/bin/glean";
    execPaths.add(whichPath);

    (execFile as Mock).mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1] as (...args: unknown[]) => void;
      cb(null, whichPath + "\n", "");
    });

    const result = await resolveGleanCli();
    expect(result).toBe(whichPath);
  });

  // -----------------------------------------------------------------------
  // 6. All paths fail
  // -----------------------------------------------------------------------
  it("returns null when every resolution strategy fails", async () => {
    // execFile rejects (default mock), fetch rejects so download fails
    (fetch as unknown as Mock).mockRejectedValue(new Error("network error"));

    const result = await resolveGleanCli();
    expect(result).toBeNull();
  });

  // -----------------------------------------------------------------------
  // 7. Auto-download succeeds
  // -----------------------------------------------------------------------
  it("returns cached bin path after successful auto-download", async () => {
    // All prior checks fail (nothing in execPaths yet)
    // execFile rejects (default mock) so which glean fails
    // fetch needs to return valid release info
    (fetch as unknown as Mock)
      // First call: release API
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tag_name: "v1.2.3" }),
      })
      // Second call: checksums.txt
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "mocked-sha  glean-cli_Darwin_arm64.tar.gz",
      });
    // createReadStream needs to emit data + end for fileSha256
    const mockReadStream = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (event === "data") handler(Buffer.from("mocked archive data"));
        if (event === "end") handler();
        return mockReadStream;
      }),
      pipe: vi.fn().mockReturnThis(),
    };
    (createReadStream as Mock).mockReturnValue(mockReadStream);

    // createHash must return an object with update/digest
    (createHash as Mock).mockReturnValue({
      update: vi.fn(),
      digest: vi.fn().mockReturnValue("mocked-sha"),
    });

    const finishHandlers: Array<(...args: unknown[]) => void> = [];
    const mockWriteStream = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (event === "finish") finishHandlers.push(handler);
        return mockWriteStream;
      }),
      close: vi.fn().mockImplementation(() => {
        finishHandlers.forEach((fn) => fn());
      }),
    };
    (createWriteStream as Mock).mockReturnValue(mockWriteStream);
    (https.get as Mock).mockImplementation((_url: string, cb: (...args: unknown[]) => void) => {
      const response = {
        statusCode: 200,
        statusMessage: "OK",
        headers: {},
        pipe: vi.fn(() => {
          setImmediate(() => finishHandlers.forEach((h) => h()));
        }),
      };
      cb(response);
      return { on: vi.fn() };
    });
    // execFile for tar extraction must succeed
    (execFile as Mock)
      // First call (which glean) -> reject
      .mockImplementationOnce((...args: unknown[]) => {
        const cb = args[args.length - 1] as (...args: unknown[]) => void;
        const err = new Error("not found") as Error & { stderr?: string; stdout?: string };
        err.stderr = "";
        err.stdout = "";
        cb(err);
      })
      // Second call (tar extraction) -> succeed
      .mockImplementationOnce((...args: unknown[]) => {
        const cb = args[args.length - 1] as (...args: unknown[]) => void;
        cb(null, { stdout: "" });
      });

    // After download, cachedBin should be executable
    execPaths.add("/tmp/test-support/glean");

    const result = await resolveGleanCli();
    expect(result).toBe("/tmp/test-support/glean");
  });
});
