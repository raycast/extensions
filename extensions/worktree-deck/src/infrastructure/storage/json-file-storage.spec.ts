import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const readFileMock = vi.hoisted(() => vi.fn<(path: string, encoding: string) => Promise<string>>());
const mkdirMock = vi.hoisted(() => vi.fn<(path: string, options: { recursive: boolean }) => Promise<void>>());
const writeFileMock = vi.hoisted(() => vi.fn<(path: string, value: string, encoding: string) => Promise<void>>());

vi.mock("node:fs", () => {
  return {
    promises: {
      readFile: readFileMock,
      mkdir: mkdirMock,
      writeFile: writeFileMock,
    },
  };
});

import { readWorktreeDeckFileStorageJson, writeWorktreeDeckFileStorageJson } from "./json-file-storage";

/**
 * file storage 解決用の最小入力を返す
 */
function buildArgs() {
  return {
    env: {},
    cwd: "/tmp/dev-flow/current",
    homeDir: "/Users/tester",
    packageDir: "/tmp/dev-flow",
    packageName: "worktree-deck",
  };
}

describe("infrastructure/storage/json-file-storage", () => {
  beforeEach(() => {
    readFileMock.mockReset();
    mkdirMock.mockReset();
    writeFileMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("readWorktreeDeckFileStorageJson はファイル不在時に null を返す", async () => {
    const error = new Error("not found") as Error & { code?: string };
    error.code = "ENOENT";
    readFileMock.mockRejectedValue(error);

    await expect(readWorktreeDeckFileStorageJson(buildArgs(), "sample.json")).resolves.toBeNull();
  });

  it("readWorktreeDeckFileStorageJson は JSON をオブジェクトとして返す", async () => {
    readFileMock.mockResolvedValue('{"value":1}');

    await expect(readWorktreeDeckFileStorageJson(buildArgs(), "sample.json")).resolves.toEqual({ value: 1 });
  });

  it("writeWorktreeDeckFileStorageJson は固定 storage ディレクトリへ保存する", async () => {
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);

    await writeWorktreeDeckFileStorageJson(buildArgs(), "sample.json", { value: 2 });

    expect(mkdirMock).toHaveBeenCalledWith("/Users/tester/.worktree-deck/storage", { recursive: true });
    expect(writeFileMock).toHaveBeenCalledWith(
      "/Users/tester/.worktree-deck/storage/sample.json",
      '{"value":2}',
      "utf8",
    );
  });
});
