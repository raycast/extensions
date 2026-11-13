import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getAuthorizationHeader } from "../src/api/authorization.ts";

test("requires an explicit authentication method and the credentials it needs", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
  const preferences = manifest.preferences;
  const authType = preferences.find((preference) => preference.name === "authType");
  const username = preferences.find((preference) => preference.name === "username");

  assert.deepEqual(
    preferences.slice(1, 4).map((preference) => preference.name),
    ["authType", "token", "username"],
  );
  assert.equal(authType.required, true);
  assert.equal("default" in authType, false);
  assert.equal(username.required, false);
  assert.equal(getAuthorizationHeader("bearer", "pat"), "Bearer pat");
  assert.equal(getAuthorizationHeader("basic", "password", "user"), "Basic dXNlcjpwYXNzd29yZA==");
  assert.throws(() => getAuthorizationHeader("basic", "password"), /Username is required/);
});
