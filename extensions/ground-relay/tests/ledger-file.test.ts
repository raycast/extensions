import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createGroundPacket, draftFromInput } from "../src/domain/packet";
import {
  appendGroundPacketInDirectory,
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
    await deleteGroundPacketInDirectory(directory, correction.id);
    expect((await listGroundPacketsInDirectory(directory))[0]!.id).toBe(root.id);
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
});
