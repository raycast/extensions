import assert from "node:assert/strict";
import test from "node:test";

import { generateUuidV7, generateUuidV7Batch } from "../src/uuidGenerator";

test("generates an RFC 9562 UUIDv7 shaped value", () => {
  const uuid = generateUuidV7();

  assert.match(
    uuid,
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test("generates the requested number of UUIDv7 values", () => {
  const uuids = generateUuidV7Batch(3);

  assert.equal(uuids.length, 3);
  assert.equal(new Set(uuids).size, 3);
});

test("keeps UUIDv7 lexical order for increasing timestamps", () => {
  const first = generateUuidV7(1_700_000_000_000);
  const second = generateUuidV7(1_700_000_000_001);

  assert.ok(first < second);
});
