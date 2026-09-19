import { beforeEach, describe, expect, it, vi } from "vitest";

const fileSystem = vi.hoisted(() => ({
  events: [] as string[],
  chmodSync: vi.fn(),
  closeSync: vi.fn(),
  fsyncSync: vi.fn(),
  linkSync: vi.fn(),
  mkdirSync: vi.fn(),
  openSync: vi.fn(),
  statSync: vi.fn(),
  unlinkSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("node:crypto", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:crypto")>();
  return { ...original, randomUUID: () => "00000000-0000-4000-8000-000000000001" };
});

vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs")>();
  return {
    ...original,
    chmodSync: fileSystem.chmodSync,
    closeSync: fileSystem.closeSync,
    fsyncSync: fileSystem.fsyncSync,
    linkSync: fileSystem.linkSync,
    mkdirSync: fileSystem.mkdirSync,
    openSync: fileSystem.openSync,
    statSync: fileSystem.statSync,
    unlinkSync: fileSystem.unlinkSync,
    writeFileSync: fileSystem.writeFileSync,
  };
});

import { ensurePrivateDirectory, publishBackupFile } from "../../src/shared/portability/backup-file";
import { PortabilityError } from "../../src/shared/portability/backup-contract";

const directory = "/private/backups";
const destination = `${directory}/worktodo-backup.json`;
const candidate = `${directory}/.worktodo-backup.json.00000000-0000-4000-8000-000000000001.tmp`;

function fileSystemError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(code), { code });
}

function expectWriteFailure(operation: () => unknown): void {
  let error: unknown;
  try {
    operation();
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(PortabilityError);
  expect(error).toMatchObject({ code: "FILE_WRITE_FAILED" });
}

describe("backup publication durability", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fileSystem.events.length = 0;
    fileSystem.statSync.mockImplementation((path: string) => {
      fileSystem.events.push(`stat:${path}`);
      return { isDirectory: () => true };
    });
    fileSystem.mkdirSync.mockImplementation((path: string) => {
      fileSystem.events.push(`mkdir:${path}`);
    });
    fileSystem.chmodSync.mockImplementation((path: string) => {
      fileSystem.events.push(`chmod:${path}`);
    });
    fileSystem.openSync.mockImplementation((path: string, flags: string) => {
      fileSystem.events.push(`open:${path}:${flags}`);
      return flags === "wx" ? 10 : path === directory ? 20 : 21;
    });
    fileSystem.writeFileSync.mockImplementation((descriptor: number) => {
      fileSystem.events.push(`write:${descriptor}`);
    });
    fileSystem.fsyncSync.mockImplementation((descriptor: number) => {
      fileSystem.events.push(`fsync:${descriptor}`);
    });
    fileSystem.closeSync.mockImplementation((descriptor: number) => {
      fileSystem.events.push(`close:${descriptor}`);
    });
    fileSystem.linkSync.mockImplementation((source: string, target: string) => {
      fileSystem.events.push(`link:${source}:${target}`);
    });
    fileSystem.unlinkSync.mockImplementation((path: string) => {
      fileSystem.events.push(`unlink:${path}`);
    });
  });

  it("flushes the file and both directory namespace changes before success", () => {
    expect(publishBackupFile(directory, "worktodo-backup.json", "{}\n")).toBe(destination);

    expect(fileSystem.events).toEqual([
      `stat:${directory}`,
      `open:${candidate}:wx`,
      `chmod:${candidate}`,
      "write:10",
      "fsync:10",
      "close:10",
      `link:${candidate}:${destination}`,
      `open:${directory}:r`,
      "fsync:20",
      "close:20",
      `unlink:${candidate}`,
      `open:${directory}:r`,
      "fsync:20",
      "close:20",
    ]);
  });

  it("flushes a prepared recovery directory and its parent", () => {
    ensurePrivateDirectory(directory);

    expect(fileSystem.events).toEqual([
      `mkdir:${directory}`,
      `chmod:${directory}`,
      `stat:${directory}`,
      `open:${directory}:r`,
      "fsync:20",
      "close:20",
      "open:/private:r",
      "fsync:21",
      "close:21",
    ]);
  });

  it("does not publish when the candidate file cannot be flushed", () => {
    fileSystem.fsyncSync.mockImplementation((descriptor: number) => {
      fileSystem.events.push(`fsync:${descriptor}`);
      if (descriptor === 10) {
        throw fileSystemError("EIO");
      }
    });

    expectWriteFailure(() => publishBackupFile(directory, "worktodo-backup.json", "{}\n"));

    expect(fileSystem.linkSync).not.toHaveBeenCalled();
    expect(fileSystem.unlinkSync).toHaveBeenCalledWith(candidate);
    expect(fileSystem.closeSync).toHaveBeenCalledWith(10);
  });

  it("removes both names when the published directory entry cannot be flushed", () => {
    fileSystem.fsyncSync.mockImplementation((descriptor: number) => {
      fileSystem.events.push(`fsync:${descriptor}`);
      if (descriptor === 20) {
        throw fileSystemError("EIO");
      }
    });

    expectWriteFailure(() => publishBackupFile(directory, "worktodo-backup.json", "{}\n"));

    expect(fileSystem.unlinkSync).toHaveBeenCalledWith(destination);
    expect(fileSystem.unlinkSync).toHaveBeenCalledWith(candidate);
    expect(fileSystem.closeSync).toHaveBeenCalledWith(20);
  });

  it("fails recovery preparation when its parent directory cannot be flushed", () => {
    fileSystem.fsyncSync.mockImplementation((descriptor: number) => {
      fileSystem.events.push(`fsync:${descriptor}`);
      if (descriptor === 21) {
        throw fileSystemError("EIO");
      }
    });

    expectWriteFailure(() => ensurePrivateDirectory(directory));

    expect(fileSystem.closeSync).toHaveBeenCalledWith(20);
    expect(fileSystem.closeSync).toHaveBeenCalledWith(21);
  });

  it("fails publication and cleans up when closing the directory handle fails", () => {
    fileSystem.closeSync.mockImplementation((descriptor: number) => {
      fileSystem.events.push(`close:${descriptor}`);
      if (descriptor === 20) {
        throw fileSystemError("EIO");
      }
    });

    expectWriteFailure(() => publishBackupFile(directory, "worktodo-backup.json", "{}\n"));

    expect(fileSystem.unlinkSync).toHaveBeenCalledWith(destination);
    expect(fileSystem.unlinkSync).toHaveBeenCalledWith(candidate);
  });
});
