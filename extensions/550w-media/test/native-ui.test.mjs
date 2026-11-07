import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("OAuth SDK provider name stays ASCII for native callback state matching", () => {
  const source = readFileSync(
    new URL("../src/media.tsx", import.meta.url),
    "utf8",
  );
  const providerName = source.match(/providerName:\s*"([^"]+)"/)?.[1];
  assert.equal(providerName, "550W Watermark & Text Eraser");
  assert.match(source, /providerId: `550w-\$\{region\}`/);
  const state = JSON.stringify({
    id: "test",
    providerName,
    flavor: "raycast-x",
    scheme: "com.raycast",
  });
  assert.equal(
    btoa(state).replace(/=*$/g, ""),
    Buffer.from(state).toString("base64url"),
  );
  assert.throws(
    () => btoa(JSON.stringify({ providerName: "550W AI去字幕去水印" })),
    { name: "InvalidCharacterError" },
  );
});

test("API Key upload failures are distinguished from input and paid submission failures", () => {
  const source = readFileSync(
    new URL("../src/media.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /uploading = true;\s+const uploaded = await request\("uploadVideo", auth, \{\}, file\);\s+uploading = false;/,
  );
  assert.match(source, /Video Upload Not Confirmed/);
  assert.match(source, /No processing request was sent/);
});

test("uncertain paid submissions retain operation ID without offering API Key receipt lookup", () => {
  const source = readFileSync(
    new URL("../src/media.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /operation=\{values.operationId\}/);
  assert.match(source, /uncertain/);
  assert.match(source, /operation && auth.mode === "oauth"/);
  assert.match(source, /API Key API has no operation receipt lookup/);
});

test("native result containers do not contain explicit whitespace text children", () => {
  const source = readFileSync(
    new URL("../src/media.tsx", import.meta.url),
    "utf8",
  );
  for (const container of source.matchAll(
    /<(ActionPanel|Detail\.Metadata)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g,
  )) {
    assert.doesNotMatch(container[0], /\{\s*["']\s+["']\s*\}/);
  }
});
