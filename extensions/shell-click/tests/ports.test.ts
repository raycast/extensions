import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePorts } from "../src/ports";

test("parses IPv4/IPv6 and deduplicates PID/port while preserving paths with spaces", () => {
  const result = parsePorts(
    "p123\ncnode\nn127.0.0.1:3000\nn[::1]:3000\nn*:8000\np456\ncOther\nn*:3000",
    " 123 01:02 /Applications/My App/node\n456 2-01:00:00 /usr/bin/other",
  );
  assert.equal(result.length, 3);
  assert.deepEqual(
    result.map((port) => port.id),
    ["123:3000", "456:3000", "123:8000"],
  );
  assert.equal(result[0].path, "/Applications/My App/node");
  assert.equal(result[0].elapsed, "01:02");
});
test("ignores malformed ports and protected process IDs", () => {
  assert.deepEqual(
    parsePorts(
      "p1\nclaunchd\nn*:80\np0\nn*:3000\np123\ncbad\nn*:0\nn*:99999\nninvalid",
      "",
    ),
    [],
  );
  assert.deepEqual(parsePorts("", ""), []);
});
