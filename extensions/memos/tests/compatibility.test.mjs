import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readSource = (relativePath) => fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");

test("current user request uses the new auth endpoint with a legacy fallback", () => {
  const apiSource = readSource("src/api.ts");

  assert.match(apiSource, /\/api\/v1\/auth\/me/);
  assert.match(apiSource, /\/api\/v1\/auth\/sessions\/current/);
});

test("memo listing does not parse a numeric user id from the resource name", () => {
  const listSource = readSource("src/memosList.tsx");

  assert.doesNotMatch(listSource, /split\("\/"\)\[1\]/);
});

test("memo listing scopes requests with the parent query parameter", () => {
  const apiSource = readSource("src/api.ts");

  assert.match(apiSource, /params\.set\("parent", creatorName\)/);
});

test("memo listing does not send a creator filter expression", () => {
  const apiSource = readSource("src/api.ts");

  assert.doesNotMatch(apiSource, /creator ==/);
});

test("memo listing does not manually revalidate when the current user changes", () => {
  const listSource = readSource("src/memosList.tsx");

  assert.doesNotMatch(listSource, /if \(currentUserName\) \{\s*revalidate\(\);/s);
});

test("memo listing does not keep a derived filter list in local state", () => {
  const listSource = readSource("src/memosList.tsx");

  assert.doesNotMatch(listSource, /const \[filterList, setFilterList\]/);
});
