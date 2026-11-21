import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  evidenceToInput,
  parseEvidence,
  retainEvidenceIds,
} from "../src/domain/packet";
import {
  appendGroundPacketInDirectory as append,
  appendCorrectionInDirectory as correct,
  deleteGroundPacketInDirectory as remove,
  inspectGroundPacketsInDirectory as inspect,
} from "../src/services/ledger-file";
import { packetFixture } from "./fixtures";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, writeFile: vi.fn(actual.writeFile) };
});
const actualFs =
  await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
const directories: string[] = [];
async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "relay-regression-"));
  directories.push(directory);
  const first = packetFixture();
  const unrelated = packetFixture();
  await append(directory, first);
  await append(directory, unrelated);
  return { directory, first, unrelated };
}
afterEach(async () => {
  vi.mocked(writeFile).mockImplementation(actualFs.writeFile);
  await Promise.all(
    directories.splice(0).map((p) => rm(p, { recursive: true, force: true })),
  );
});

describe("atomic retirement reservations", () => {
  it("allows an unrelated correction while a reservation is partially written", async () => {
    const { directory, first, unrelated } = await setup();
    vi.mocked(writeFile).mockImplementationOnce(async (path, data, options) => {
      await actualFs.writeFile(path, "{", options);
      expect(await readdir(directory)).not.toContain(
        `.retired-${first.id}.json`,
      );
      expect(
        (await correct(directory, unrelated, unrelated.draft)).version,
      ).toBe(2);
      await actualFs.writeFile(path, data, "utf8");
    });
    await remove(directory, first.id, (path) =>
      rename(path, join(directory, "trash")),
    );
    expect(
      JSON.parse(
        await readFile(join(directory, `.retired-${first.id}.json`), "utf8"),
      ),
    ).toMatchObject({
      id: first.id,
      rootId: first.rootId,
      version: first.version,
    });
    expect(
      (await readdir(directory)).filter((n) => n.endsWith(".tmp")),
    ).toEqual([]);
  });
  it("does not trash the record or poison other corrections when a reservation write fails", async () => {
    const { directory, first, unrelated } = await setup();
    const before = await readFile(join(directory, `${first.id}.json`), "utf8");
    vi.mocked(writeFile).mockImplementationOnce(
      async (path, _data, options) => {
        await actualFs.writeFile(path, "{", options);
        throw new Error("interrupted write");
      },
    );
    const trash = vi.fn();
    await expect(remove(directory, first.id, trash)).rejects.toThrow(
      "interrupted write",
    );
    expect(trash).not.toHaveBeenCalled();
    expect(await readFile(join(directory, `${first.id}.json`), "utf8")).toBe(
      before,
    );
    expect((await correct(directory, unrelated, unrelated.draft)).version).toBe(
      2,
    );
    expect(
      (await readdir(directory)).filter(
        (n) => n.endsWith(".tmp") || n.startsWith(".retired-"),
      ),
    ).toEqual([]);
  });
  it("ignores abandoned temporary reservations left by a terminated process", async () => {
    const { directory, first, unrelated } = await setup();
    await writeFile(
      join(directory, `.retired-${first.id}.interrupted.tmp`),
      "{",
    );
    expect((await correct(directory, unrelated, unrelated.draft)).version).toBe(
      2,
    );
  });
  it("retries a failed trash with its existing reservation without overwriting it", async () => {
    const { directory, first } = await setup();
    await expect(
      remove(directory, first.id, async () => {
        throw new Error("trash failed");
      }),
    ).rejects.toThrow("trash failed");
    const reservation = join(directory, `.retired-${first.id}.json`);
    const before = await readFile(reservation, "utf8");
    await remove(directory, first.id, (path) =>
      rename(path, join(directory, "trash")),
    );
    expect(await readFile(reservation, "utf8")).toBe(before);
  });
});

describe("evidence identity during corrections", () => {
  const previous = [
    { id: "A", claim: "first", receiptBearing: false },
    { id: "B", claim: "second", receiptBearing: false },
  ];
  it("preserves A and B when A is edited to match B, including reordered entries", () => {
    const edited = [{ ...previous[0]!, claim: "second" }, previous[1]!];
    expect(
      parseEvidence(evidenceToInput(edited).split("\n"), previous),
    ).toEqual(edited);
    expect(
      parseEvidence(
        evidenceToInput([...edited].reverse()).split("\n"),
        previous,
      ),
    ).toEqual([...edited].reverse());
  });
  it("does not remap explicit identities in the legacy correction retention step", () => {
    const edited = [{ ...previous[0]!, claim: "second" }, previous[1]!];
    const parsed = parseEvidence(evidenceToInput(edited).split("\n"));
    expect(retainEvidenceIds(parsed, previous)).toEqual(edited);
  });
  it("never inherits a previous duplicate ID twice from plain text", () => {
    const duplicates = [previous[0]!, previous[0]!];
    const result = parseEvidence(["first", "first"], duplicates);
    expect(new Set(result.map((e) => e.id)).size).toBe(2);
  });
  it("preserves explicit new structured IDs even when their content matches old evidence", () => {
    const item = { ...previous[1]!, id: "C" };
    expect(parseEvidence([JSON.stringify(item)], previous)).toEqual([item]);
  });
  it("reserves structured IDs before matching new plain-text lines", () => {
    for (const lines of [
      ["second", JSON.stringify(previous[1])],
      [JSON.stringify(previous[1]), "second"],
    ]) {
      const result = parseEvidence(lines, previous);
      expect(new Set(result.map((e) => e.id)).size).toBe(2);
      expect(result.filter((e) => e.id === "B")).toHaveLength(1);
    }
    expect(
      parseEvidence(["first", "first"], previous).map((e) => e.id),
    ).toEqual(["A", expect.not.stringMatching(/^A$/)]);
  });
  it("rejects duplicate structured IDs rather than saving an ambiguous correction", () => {
    expect(() =>
      parseEvidence(
        [JSON.stringify(previous[0]), JSON.stringify(previous[0])],
        previous,
      ),
    ).toThrow("Duplicate structured evidence IDs");
  });
  it("appends the corrected identities without modifying the original record bytes", async () => {
    const { directory, first } = await setup();
    // A separate lineage starts with the evidence fixture, then receives a correction.
    const base = {
      ...packetFixture(),
      draft: { ...first.draft, evidence: previous },
    };
    await append(directory, base);
    const original = await readFile(join(directory, `${base.id}.json`), "utf8");
    const edited = [{ ...previous[0]!, claim: "second" }, previous[1]!];
    const saved = await correct(directory, base, {
      ...base.draft,
      evidence: parseEvidence(evidenceToInput(edited).split("\n"), previous),
    });
    expect(saved.draft.evidence).toEqual(edited);
    expect(await readFile(join(directory, `${base.id}.json`), "utf8")).toBe(
      original,
    );
    expect((await inspect(directory)).warnings).toEqual([]);
  });
});
