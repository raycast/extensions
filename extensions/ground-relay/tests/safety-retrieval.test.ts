import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { packetFixture, splatFixture } from "./fixtures";
import {
  inspectGroundPacketsInDirectory,
  appendGroundPacketInDirectory,
} from "../src/services/ledger-file";
import { queryRecords, getRecord } from "../src/domain/query";
import { makeHandoff, readHandoff } from "../src/domain/handoff";
import { receiveHandoff } from "../src/domain/receive";
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((p) => rm(p, { recursive: true, force: true })),
  );
});
async function directory() {
  const p = await mkdtemp(join(tmpdir(), "relay-safety-"));
  directories.push(p);
  return p;
}
describe("ledger integrity and retrieval", () => {
  it("reports malformed JSON, incomplete records and filename identity mismatch without hiding valid records", async () => {
    const p = await directory(),
      record = packetFixture();
    await appendGroundPacketInDirectory(p, record);
    await writeFile(join(p, "bad.json"), "{");
    await writeFile(
      join(p, `${randomUUID()}.json`),
      JSON.stringify({ ...record, draft: {} }),
    );
    await writeFile(join(p, `${randomUUID()}.json`), JSON.stringify(record));
    const result = await inspectGroundPacketsInDirectory(p);
    expect(result.records).toEqual([record]);
    expect(result.warnings).toHaveLength(3);
  });
  it("never overwrites an existing ID", async () => {
    const p = await directory(),
      r = packetFixture();
    await appendGroundPacketInDirectory(p, r);
    await expect(
      appendGroundPacketInDirectory(p, {
        ...r,
        draft: { ...r.draft, title: "Changed" },
      }),
    ).rejects.toThrow();
    expect(
      JSON.parse(await readFile(join(p, `${r.id}.json`), "utf8")).draft.title,
    ).toBe(r.draft.title);
  });
  it("distinguishes an unavailable ledger from an empty ledger", async () => {
    const p = await directory();
    await writeFile(join(p, "file"), "not a directory");
    await expect(
      inspectGroundPacketsInDirectory(join(p, "file")),
    ).rejects.toThrow("Cannot read");
    expect(
      (await inspectGroundPacketsInDirectory(join(p, "missing"))).records,
    ).toEqual([]);
  });
  it("searches latest versions, pages results, supports history and reports missing exact IDs", () => {
    const old = packetFixture(),
      next = {
        ...old,
        id: randomUUID(),
        version: 2,
        draft: { ...old.draft, title: "New title" },
      };
    const result = { records: [next, old], warnings: ["unreadable"] };
    expect(
      queryRecords(result, { query: "Website" }, (r) => r.draft.title).total,
    ).toBe(0);
    expect(
      queryRecords(
        result,
        { query: "Website", includeHistory: true },
        (r) => r.draft.title,
      ).records,
    ).toEqual([old]);
    expect(
      queryRecords(
        result,
        { includeHistory: true, limit: 1 },
        (r) => r.draft.title,
      ).nextOffset,
    ).toBe(1);
    expect(getRecord(result, "missing")).toMatchObject({
      found: false,
      record: null,
      warnings: ["unreadable"],
    });
    expect(() =>
      queryRecords(result, { limit: -1 }, (r) => r.draft.title),
    ).toThrow();
  });
});
describe("structured handoff", () => {
  it("preserves exact source identity and detects tampering", () => {
    const record = packetFixture(),
      h = makeHandoff("ground-relay", record);
    expect(readHandoff(h, "ground-relay")).toEqual(h);
    expect(() => readHandoff({ ...h, version: 99 }, "ground-relay")).toThrow();
    expect(() =>
      readHandoff(
        { ...h, recordJson: h.recordJson.replace("Website", "Tampered") },
        "ground-relay",
      ),
    ).toThrow();
  });
  it("rejects unrelated, malformed and wrong-direction content", () => {
    expect(() => readHandoff({}, "ground-relay")).toThrow();
    expect(() =>
      receiveHandoff(makeHandoff("ground-relay", packetFixture())),
    ).toThrow();
  });
  it("maps the peer snapshot for review without upgrading authority or evidence", () => {
    const peer = splatFixture();
    const result = receiveHandoff(makeHandoff("lawful-splat", peer));
    expect(result.handoff?.id).toBe(peer.id);
    expect(result.handoff?.version).toBe(peer.version);
    expect(JSON.parse(result.handoff!.recordJson)).toEqual(peer);
    expect(result.evidence).toEqual([]);
    expect(result.uncertainties.length).toBeGreaterThan(0);
  });
});

import {
  evidenceToInput,
  parseEvidence,
  retainEvidenceIds,
} from "../src/domain/packet";
it("preserves blank source columns and stable evidence IDs through correction", () => {
  const original = packetFixture().draft.evidence;
  const parsed = parseEvidence(evidenceToInput(original).split("\n"));
  expect(parsed[0]).toMatchObject({
    receiptBearing: false,
    observedAt: "2026-11-08",
  });
  expect(parsed[0]?.sourceRef).toBeUndefined();
  expect(retainEvidenceIds(parsed, original)[0]?.id).toBe(original[0]?.id);
});
