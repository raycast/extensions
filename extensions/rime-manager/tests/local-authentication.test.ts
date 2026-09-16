import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

test("native authentication uses macOS device-owner authentication without accepting password input", async () => {
  const source = await readFile(join(process.cwd(), "native", "rime-manager-auth.swift"), "utf8");
  assert.match(source, /\.deviceOwnerAuthentication/);
  assert.match(source, /LocalAuthentication/);
  assert.match(source, /writeRevealGrant\(at: grantPath\)/);
  assert.match(source, /\.posixPermissions: 0o600/);
  assert.match(source, /process\.arguments = \["--open-deeplink", deeplink\]/);
  assert.match(source, /NSWorkspace\.shared\.open\(url\)/);
  assert.match(source, /Task\.sleep\(nanoseconds: 350_000_000\)/);
  assert.doesNotMatch(source, /readLine|password/i);
});

test("Raycast consumes a short-lived one-time native authentication grant", async () => {
  const source = await readFile(join(process.cwd(), "src", "lib", "local-authentication.ts"), "utf8");
  assert.match(source, /REVEAL_GRANT_TTL_MS = 60_000/);
  assert.match(source, /\["--grant-path", grantPath, "--deeplink", commandDeeplink\]/);
  assert.match(source, /await unlink\(grantPath\)/);
  assert.match(source, /age >= 0 && age <= REVEAL_GRANT_TTL_MS/);
});
