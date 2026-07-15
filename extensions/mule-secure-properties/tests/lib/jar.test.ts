import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
  showToast: vi.fn(),
  Toast: { Style: { Failure: "failure", Success: "success" } },
}));

vi.mock("node:stream/promises", () => ({
  pipeline: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:crypto", () => ({
  createHash: vi.fn(),
}));

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    default: {
      ...actual,
      promises: {
        access: vi.fn(),
        unlink: vi.fn(),
        readFile: vi.fn(),
      },
      createWriteStream: vi.fn(),
      constants: actual.constants,
    },
    promises: {
      access: vi.fn(),
      unlink: vi.fn(),
      readFile: vi.fn(),
    },
    createWriteStream: vi.fn(),
    constants: actual.constants,
  };
});

vi.mock("node:https", () => ({
  default: {
    get: vi.fn(),
  },
}));

import { createHash } from "node:crypto";
import fs from "node:fs";
import https from "node:https";
import { pipeline } from "node:stream/promises";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { DEFAULT_JAR_DOWNLOAD_URL, SUCCESS_MESSAGES } from "../../src/constants";
import {
  doesJarExist,
  downloadJar,
  ensureJarAvailable,
  resolveJarDownloadConfig,
  verifyJarIntegrity,
} from "../../src/utils";

const KNOWN_SHA = "802bb7ead7b5a5811cb69333fb05ec6dd507c615058663553c87c84ae404437c";

const mockDigest = (hex: string) => {
  vi.mocked(createHash).mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue(hex),
  } as never);
};

const mockSuccessfulGet = () => {
  const response = { statusCode: 200, resume: vi.fn() };
  vi.mocked(https.get).mockImplementation((_url, callback) => {
    const request = new EventEmitter();
    queueMicrotask(() => (callback as (res: typeof response) => void)(response));
    return request as never;
  });
};

describe("resolveJarDownloadConfig", () => {
  it("defaults to the official latest URL with no SHA", () => {
    expect(resolveJarDownloadConfig({})).toEqual({
      url: DEFAULT_JAR_DOWNLOAD_URL,
      sha256: undefined,
    });
  });

  it("uses preference URL and normalizes SHA", () => {
    expect(
      resolveJarDownloadConfig({
        jarDownloadUrl: " https://example.com/tool.jar ",
        jarSha256: ` ${KNOWN_SHA.toUpperCase()} `,
      }),
    ).toEqual({
      url: "https://example.com/tool.jar",
      sha256: KNOWN_SHA,
    });
  });
});

describe("doesJarExist", () => {
  beforeEach(() => {
    vi.mocked(fs.promises.access).mockReset();
  });

  it("returns true when the jar is accessible", async () => {
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);
    await expect(doesJarExist()).resolves.toBe(true);
  });

  it("returns false when access fails", async () => {
    vi.mocked(fs.promises.access).mockRejectedValue(new Error("missing"));
    await expect(doesJarExist()).resolves.toBe(false);
  });
});

describe("verifyJarIntegrity", () => {
  beforeEach(() => {
    vi.mocked(fs.promises.readFile).mockReset();
    vi.mocked(createHash).mockReset();
  });

  it("skips hashing when no expected digest is configured", async () => {
    await expect(verifyJarIntegrity()).resolves.toBe(true);
    expect(fs.promises.readFile).not.toHaveBeenCalled();
  });

  it("returns true when the digest matches", async () => {
    vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from("jar-bytes"));
    mockDigest(KNOWN_SHA);
    await expect(verifyJarIntegrity(KNOWN_SHA)).resolves.toBe(true);
  });

  it("returns false when the digest does not match", async () => {
    vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from("jar-bytes"));
    mockDigest("deadbeef");
    await expect(verifyJarIntegrity(KNOWN_SHA)).resolves.toBe(false);
  });
});

describe("downloadJar", () => {
  beforeEach(() => {
    vi.mocked(https.get).mockReset();
    vi.mocked(fs.createWriteStream).mockReset();
    vi.mocked(fs.promises.unlink).mockReset();
    vi.mocked(fs.promises.readFile).mockReset();
    vi.mocked(pipeline).mockReset();
    vi.mocked(createHash).mockReset();
    vi.mocked(LocalStorage.setItem).mockReset();
    vi.mocked(pipeline).mockResolvedValue(undefined);
    vi.mocked(fs.createWriteStream).mockReturnValue({ destroy: vi.fn() } as never);
    vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from("jar-bytes"));
  });

  it("writes a successful response without requiring a SHA", async () => {
    mockSuccessfulGet();

    await expect(downloadJar({ url: DEFAULT_JAR_DOWNLOAD_URL })).resolves.toBeUndefined();
    expect(pipeline).toHaveBeenCalled();
    expect(LocalStorage.setItem).toHaveBeenCalled();
  });

  it("rejects when a required SHA fails and cleans up", async () => {
    const destroy = vi.fn();
    vi.mocked(fs.createWriteStream).mockReturnValue({ destroy } as never);
    mockDigest("bad-hash");
    vi.mocked(fs.promises.unlink).mockResolvedValue(undefined);
    mockSuccessfulGet();

    await expect(downloadJar({ url: DEFAULT_JAR_DOWNLOAD_URL, sha256: KNOWN_SHA })).rejects.toThrow(
      "SHA-256 check",
    );
    expect(destroy).toHaveBeenCalled();
    expect(fs.promises.unlink).toHaveBeenCalled();
  });

  it("rejects non-200 responses and cleans up the partial file", async () => {
    const destroy = vi.fn();
    vi.mocked(fs.createWriteStream).mockReturnValue({ destroy } as never);
    vi.mocked(fs.promises.unlink).mockResolvedValue(undefined);
    const response = { statusCode: 404, resume: vi.fn() };

    vi.mocked(https.get).mockImplementation((_url, callback) => {
      const request = new EventEmitter();
      queueMicrotask(() => (callback as (res: typeof response) => void)(response));
      return request as never;
    });

    await expect(downloadJar({ url: DEFAULT_JAR_DOWNLOAD_URL })).rejects.toThrow("Status code: 404");
    expect(destroy).toHaveBeenCalled();
    expect(fs.promises.unlink).toHaveBeenCalled();
  });
});

describe("ensureJarAvailable", () => {
  beforeEach(() => {
    vi.mocked(fs.promises.access).mockReset();
    vi.mocked(fs.promises.readFile).mockReset();
    vi.mocked(showToast).mockReset();
    vi.mocked(https.get).mockReset();
    vi.mocked(pipeline).mockReset();
    vi.mocked(createHash).mockReset();
    vi.mocked(LocalStorage.getItem).mockReset();
    vi.mocked(LocalStorage.setItem).mockReset();
    vi.mocked(pipeline).mockResolvedValue(undefined);
    vi.mocked(fs.createWriteStream).mockReturnValue({ destroy: vi.fn() } as never);
    vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from("jar-bytes"));
  });

  it("does nothing when a jar already exists for the same source URL", async () => {
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);
    vi.mocked(LocalStorage.getItem).mockResolvedValue(DEFAULT_JAR_DOWNLOAD_URL);

    await ensureJarAvailable({ url: DEFAULT_JAR_DOWNLOAD_URL });

    expect(showToast).not.toHaveBeenCalled();
    expect(https.get).not.toHaveBeenCalled();
  });

  it("downloads and toasts when the jar is missing", async () => {
    vi.mocked(fs.promises.access).mockRejectedValue(new Error("missing"));
    vi.mocked(LocalStorage.getItem).mockResolvedValue(undefined);
    mockSuccessfulGet();

    await ensureJarAvailable({ url: DEFAULT_JAR_DOWNLOAD_URL });

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Success,
      title: "Download Complete",
      message: SUCCESS_MESSAGES.JAR_DOWNLOADED,
    });
  });

  it("re-downloads when the configured source URL changes", async () => {
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);
    vi.mocked(LocalStorage.getItem).mockResolvedValue("https://example.com/old.jar");
    mockSuccessfulGet();

    await ensureJarAvailable({ url: DEFAULT_JAR_DOWNLOAD_URL });

    expect(https.get).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();
  });
});
