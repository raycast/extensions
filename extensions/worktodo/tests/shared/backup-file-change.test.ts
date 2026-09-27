import { beforeEach, describe, expect, it, vi } from "vitest";

const fileSystem = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs")>();
  return { ...original, readFileSync: fileSystem.readFileSync, statSync: fileSystem.statSync };
});

import { PortabilityError } from "../../src/shared/portability/backup-contract";
import { PortabilityService } from "../../src/shared/portability/portability-service";
import type { ReplaceableTaskRepository } from "../../src/shared/portability/replace-backup";

const contents = Buffer.from(
  JSON.stringify({
    format: "worktodo-backup",
    version: 1,
    exportedAtMs: 1_000,
    projects: [],
    sections: [],
    tasks: [],
  }),
);

function stats(mtimeNs: bigint) {
  return {
    dev: 1n,
    ino: 2n,
    size: BigInt(contents.byteLength),
    mtimeNs,
    ctimeNs: 1n,
    isFile: () => true,
  };
}

describe("stable backup reads", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fileSystem.readFileSync.mockReturnValue(contents);
    fileSystem.statSync.mockReturnValueOnce(stats(1n)).mockReturnValueOnce(stats(2n));
  });

  it("rejects a file changed during Portability service preparation before reading current data", () => {
    const transaction = vi.fn(<Result>(operation: () => Result) => operation());
    const repository = { transaction } as unknown as ReplaceableTaskRepository;
    const portability = new PortabilityService(repository, "/tmp/recovery", () => 2_000);

    let error: unknown;
    try {
      portability.prepare("/tmp/worktodo-backup.json");
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(PortabilityError);
    expect(error).toMatchObject({ code: "FILE_CHANGED" });
    expect((error as Error).message).toContain("Worktodo data was not changed.");
    expect(transaction).not.toHaveBeenCalled();
  });
});
