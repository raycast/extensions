import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

test("shared client matches the frozen MCP source after Raycast formatting", () => {
  const source = readFileSync(new URL("../src/client.ts", import.meta.url), "utf8").replace(
    /^  \/\/ eslint-disable-next-line no-control-regex -- Reject URL control characters before parsing\.\n/m,
    "",
  );
  // Prettier-normalized SHA-256 of the coordinator's accepted hardened MCP client.
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "72c7a2688fc9e081e8a5f9f822d755040c1bb36e82e553a925f6b97c54df4aad",
  );
});
