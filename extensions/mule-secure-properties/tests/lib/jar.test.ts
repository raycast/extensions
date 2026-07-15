import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
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
import { showToast, Toast } from "@raycast/api";
import { JAR_SHA256, SUCCESS_MESSAGES } from "../../src/constants";
import { doesJarExist, downloadJar, ensureJarAvailable, verifyJarIntegrity } from "../../src/utils";

const mockDigest = (hex: string) => {
  vi.mocked(createHash).mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue(hex),
  } as never);
};

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

  it("returns true when the digest matches", async () => {
    vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from("jar-bytes"));
    mockDigest(JAR_SHA256);
    await expect(verifyJarIntegrity()).resolves.toBe(true);
  });

  it("returns false when the digest does not match", async () => {
    vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from("jar-bytes"));
    mockDigest("deadbeef");
    await expect(verifyJarIntegrity()).resolves.toBe(false);
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
    vi.mocked(pipeline).mockResolvedValue(undefined);
    vi.mocked(fs.createWriteStream).mockReturnValue({ destroy: vi.fn() } as never);
    vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from("jar-bytes"));
    mockDigest(JAR_SHA256);
  });

  it("writes a successful response to disk", async () => {
    const response = { statusCode: 200, resume: vi.fn() };

    vi.mocked(https.get).mockImplementation((_url, callback) => {
      const request = new EventEmitter();
      queueMicrotask(() => (callback as (res: typeof response) => void)(response));
      return request as never;
    });

    await expect(downloadJar()).resolves.toBeUndefined();
    expect(pipeline).toHaveBeenCalled();
  });

  it("rejects when integrity check fails and cleans up", async () => {
    const destroy = vi.fn();
    vi.mocked(fs.createWriteStream).mockReturnValue({ destroy } as never);
    mockDigest("bad-hash");
    vi.mocked(fs.promises.unlink).mockResolvedValue(undefined);
    const response = { statusCode: 200, resume: vi.fn() };

    vi.mocked(https.get).mockImplementation((_url, callback) => {
      const request = new EventEmitter();
      queueMicrotask(() => (callback as (res: typeof response) => void)(response));
      return request as never;
    });

    await expect(downloadJar()).rejects.toThrow("integrity check");
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

    await expect(downloadJar()).rejects.toThrow("Status code: 404");
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
    vi.mocked(pipeline).mockResolvedValue(undefined);
    vi.mocked(fs.createWriteStream).mockReturnValue({ destroy: vi.fn() } as never);
    vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from("jar-bytes"));
    mockDigest(JAR_SHA256);
  });

  it("does nothing when a valid jar already exists", async () => {
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);
    await ensureJarAvailable();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("downloads and toasts when the jar is missing", async () => {
    vi.mocked(fs.promises.access).mockRejectedValue(new Error("missing"));
    const response = { statusCode: 200, resume: vi.fn() };

    vi.mocked(https.get).mockImplementation((_url, callback) => {
      const request = new EventEmitter();
      queueMicrotask(() => (callback as (res: typeof response) => void)(response));
      return request as never;
    });

    await ensureJarAvailable();

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Success,
      title: "Download Complete",
      message: SUCCESS_MESSAGES.JAR_DOWNLOADED,
    });
  });
});
