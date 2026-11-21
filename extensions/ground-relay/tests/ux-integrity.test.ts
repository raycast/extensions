import type { SplatRecord } from "../src/domain/peer-types";
import { receiveHandoff } from "../src/domain/receive";
import type { GroundPacketRecord } from "../src/domain/types";
import { describe, expect, it } from "vitest";
import { randomUUID, createHash } from "node:crypto";
import { mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeHandoff, readHandoff } from "../src/domain/handoff";
import { latestVersions, matchesQuery } from "../src/domain/query";
import { packetFixture, splatFixture } from "./fixtures";
it("verifies original snapshot bytes and preserves a correctly rehashed formatted snapshot", () => {
  const h = makeHandoff("ground-relay", packetFixture());
  const recordJson = JSON.stringify(JSON.parse(h.recordJson), null, 2);
  expect(() => readHandoff({ ...h, recordJson }, "ground-relay")).toThrow(
    "digest",
  );
  const formatted = {
    ...h,
    recordJson,
    sha256: createHash("sha256").update(recordJson).digest("hex"),
  };
  expect(readHandoff(formatted, "ground-relay")).toEqual(formatted);
});
it("shows tied latest versions and searches source references as well as titles", () => {
  const old = packetFixture(),
    next = { ...old, id: randomUUID(), version: 2 },
    conflict = { ...next, id: randomUUID() };
  expect(latestVersions([old, next, conflict])).toEqual([next, conflict]);
  expect(
    matchesQuery(
      { title: "Release", source: "https://example.test/decision" },
      "release decision",
    ),
  ).toBe(true);
  expect(matchesQuery(old, "something absent")).toBe(false);
});
import { evidenceToInput, parseEvidence } from "../src/domain/packet";
import {
  appendGroundPacketInDirectory as append,
  appendCorrectionInDirectory,
  deleteGroundPacketInDirectory as remove,
  inspectGroundPacketsInDirectory as inspect,
} from "../src/services/ledger-file";
const fixture = (): GroundPacketRecord => packetFixture();
const correct = (directory: string, base: ReturnType<typeof fixture>) =>
  appendCorrectionInDirectory(directory, base, base.draft);
const encode = evidenceToInput;
const decode = (text: string) => parseEvidence(text.split("\n"));
const unusual = [
  {
    id: "e-stable",
    claim: "a || b\nsecond line",
    sourceRef: "https://example.test/a||b",
    observedAt: "yesterday\ntoday",
    receiptBearing: false,
  },
];
describe("evidence round trips", () => {
  it("preserves multiline text, delimiter characters, stable IDs, and advisory status", () => {
    expect(decode(encode(unusual))).toEqual(unusual);
  });
  it("rejects invalid structured evidence rather than reinterpreting it as a new claim", () => {
    expect(() => decode('{"claim":"missing schema"}')).toThrow();
  });
});
it("does not reuse a trashed revision number; restored versions remain editable from the latest", async () => {
  const directory = await mkdtemp(join(tmpdir(), "raycast-restore-"));
  try {
    const first = fixture();
    await append(directory, first);
    const second = await correct(directory, first);
    const trashed = join(directory, "saved-in-trash");
    await remove(directory, second.id, (path) => rename(path, trashed));
    const third = await correct(directory, first);
    expect(third.version).toBe(3);
    await rename(trashed, join(directory, `${second.id}.json`));
    const fourth = await correct(directory, third);
    expect(fourth.version).toBe(4);
    expect((await inspect(directory)).records).toHaveLength(4);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
it("refuses corrupt deleted-version reservations rather than risking a version collision", async () => {
  const directory = await mkdtemp(join(tmpdir(), "raycast-reservation-"));
  try {
    const first = fixture();
    await append(directory, first);
    await writeFile(join(directory, ".retired-invalid.json"), "{}");
    await expect(correct(directory, first)).rejects.toThrow("reservation");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("does not upgrade a source-linked advisory receipt during paired handoff", () => {
  const peer: SplatRecord = splatFixture();
  peer.draft.receipts.push({
    id: "advisory",
    kind: "artifact",
    content: "Unverified",
    sourceRef: "example.test",
    currentness: "unknown",
    receiptBearing: false,
  });
  expect(
    receiveHandoff(makeHandoff("lawful-splat", peer)).evidence[0]
      ?.receiptBearing,
  ).toBe(false);
});
