import assert from "node:assert/strict";
import test from "node:test";

import { formatJson, validateJson } from "../src/jsonTool";

test("validates valid JSON", () => {
  assert.deepEqual(validateJson('{"service":"api","enabled":true}'), {
    valid: true,
  });
});

test("returns parse error for invalid JSON", () => {
  const result = validateJson('{"service":}');

  assert.equal(result.valid, false);
  assert.match(result.error ?? "", /JSON/);
});

test("formats JSON with two-space indentation", () => {
  assert.equal(
    formatJson('{"service":"api","ports":[8080,8081]}'),
    `{
  "service": "api",
  "ports": [
    8080,
    8081
  ]
}`,
  );
});
