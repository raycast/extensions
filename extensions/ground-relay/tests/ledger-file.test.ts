import { mkdtemp, readFile, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createGroundPacket, draftFromInput } from "../src/domain/packet";
import {
  appendGroundPacketInDirectory,
  appendCorrectionInDirectory,
  deleteGroundPacketInDirectory,
  listGroundPacketsInDirectory,
} from "../src/services/ledger-file";

describe("ground packet ledger", () => {
  it("appends, lists, and deletes independent versions", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ground-relay-"));
    const root = createGroundPacket(draftFromInput({ situation: "Initial state" }));
    const correction = createGroundPacket(
      { ...root.draft, situation: "Corrected state", correctionReason: "New receipt" },
      { rootId: root.rootId, version: 2, supersedesId: root.id },
    );
    await appendGroundPacketInDirectory(directory, root);
    await appendGroundPacketInDirectory(directory, correction);
    expect(await listGroundPacketsInDirectory(directory)).toHaveLength(2);
    const trashedPath = join(directory, `${correction.id}.trashed`);
    await deleteGroundPacketInDirectory(
      directory,
      correction.id,
      async (path) => rename(path, trashedPath),
    );
    expect((await listGroundPacketsInDirectory(directory))[0]!.id).toBe(root.id);
    expect(
      JSON.parse(await readFile(trashedPath, "utf8")).id,
    ).toBe(correction.id);
  });

  it("ignores malformed files", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ground-relay-"));
    await writeFile(join(directory, "00000000-0000-0000-0000-000000000000.json"), "not json");
    expect(await listGroundPacketsInDirectory(directory)).toEqual([]);
  });

  it("writes a readable JSON record", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ground-relay-"));
    const record = createGroundPacket(draftFromInput({ situation: "Portable state" }));
    await appendGroundPacketInDirectory(directory, record);
    expect(JSON.parse(await readFile(join(directory, `${record.id}.json`), "utf8")).id).toBe(record.id);
  });

  it("rejects a stale parallel correction instead of forking a lineage", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ground-relay-"));
    const root = createGroundPacket(
      draftFromInput({ situation: "Initial state" }),
    );
    await appendGroundPacketInDirectory(directory, root);

    const results = await Promise.allSettled([
      appendCorrectionInDirectory(directory, root, {
        ...root.draft,
        situation: "First correction",
        correctionReason: "First receipt",
      }),
      appendCorrectionInDirectory(directory, root, {
        ...root.draft,
        situation: "Second correction",
        correctionReason: "Second receipt",
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejection = results.find((result) => result.status === "rejected");
    expect(rejection).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({
        message: expect.stringContaining("lineage advanced to v2"),
      }),
    });
    expect(
      (await listGroundPacketsInDirectory(directory)).map(
        (record) => record.version,
      ),
    ).toEqual([2, 1]);
  });
});
