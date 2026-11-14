import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  parseDescriptor,
  parseReceipt,
  parseSnapshot,
} from "../src/lib/contract";
import { makeRequest } from "../src/lib/transport";

const fixtureRoot = join(__dirname, "fixtures", "swift-v1");
async function fixture(name: string) {
  return JSON.parse(await readFile(join(fixtureRoot, name), "utf8"));
}

test("Swift Codable output decodes with UUID normalization and optional keys absent", async () => {
  const descriptor = parseDescriptor(await fixture("descriptor.json"));
  const snapshot = parseSnapshot(await fixture("state.json"));
  const receipt = parseReceipt(await fixture("receipt.json"));
  assert.equal(descriptor.namespaceEpoch, snapshot.namespaceEpoch);
  assert.equal(
    snapshot.tasks[0].taskID,
    "aaaaaaaa-bbbb-4000-8000-000000000004",
  );
  assert.equal(receipt.resultingTaskID, snapshot.tasks[0].taskID);
  assert.equal(receipt.status, "succeeded");
  assert.equal(receipt.reasonCode, undefined);
  assert.equal(snapshot.tasks[0].failureCode, undefined);
});
test("TypeScript request has the same wire shape as the Swift encoded request", async () => {
  const expected = await fixture("request.json");
  const result = makeRequest(
    {
      descriptor: parseDescriptor(await fixture("descriptor.json")),
      snapshot: parseSnapshot(await fixture("state.json")),
    },
    "reviewAddURL",
    {
      now: expected.createdAt,
      requestID: expected.requestID,
      url: expected.url,
    },
  );
  assert.deepEqual(
    { ...result, clientVersion: expected.clientVersion },
    expected,
  );
  const encoded = await readFile(join(fixtureRoot, "request.json"));
  assert.equal(
    createHash("sha256").update(encoded).digest("hex"),
    "9c179dda83cdb729379b40bc0bdf48633e0c1e449a6c9ed4d0aa70d90b7d62a6",
  );
});
