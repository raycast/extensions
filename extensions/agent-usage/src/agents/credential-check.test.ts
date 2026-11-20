import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkAmpCredentials } from "../amp/auth.ts";
import { checkGrokCredentials } from "../grok/auth.ts";
import { checkAntigravityCredentials } from "../antigravity/credential-check.ts";
import { AntigravityProbeError } from "../antigravity/probe.ts";
import { withCredentialStatus } from "./format.ts";

test("file-based checks distinguish logout from malformed and unreadable credentials", async () => {
  const dir = await mkdtemp(join(tmpdir(), "credential-check-"));
  const file = join(dir, "auth.json");
  try {
    for (const check of [() => checkAmpCredentials(file, {}), () => checkGrokCredentials(file)]) {
      assert.deepEqual(await check(), { status: "signed_out" });
    }
    await writeFile(file, "{partial");
    assert.deepEqual(await checkAmpCredentials(file, {}), { status: "unverified" });
    assert.deepEqual(await checkGrokCredentials(file), { status: "unverified" });
    assert.deepEqual(await checkAmpCredentials(dir, {}), { status: "unverified" });
    assert.deepEqual(await checkGrokCredentials(dir), { status: "unverified" });
    await writeFile(file, "{}");
    assert.deepEqual(await checkAmpCredentials(file, {}), { status: "signed_out" });
    assert.deepEqual(await checkGrokCredentials(file), { status: "signed_out" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("Amp detects credential changes and honors an environment key over file credentials", async () => {
  const dir = await mkdtemp(join(tmpdir(), "amp-check-"));
  const file = join(dir, "secrets.json");
  try {
    await writeFile(file, JSON.stringify({ "apiKey@https://ampcode.com/": "first" }));
    const first = await checkAmpCredentials(file, {});
    assert.equal(first.status, "authenticated");
    await writeFile(file, JSON.stringify({ "apiKey@https://ampcode.com/": "second" }));
    assert.notDeepEqual(await checkAmpCredentials(file, {}), first);
    const env = { AMP_API_KEY: "environment-key" };
    const environmentCheck = await checkAmpCredentials(file, env);
    await rm(file);
    assert.deepEqual(await checkAmpCredentials(file, env), environmentCheck);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("Grok identity survives access token renewal but changes with account scope", async () => {
  const dir = await mkdtemp(join(tmpdir(), "grok-check-"));
  const file = join(dir, "auth.json");
  const entry = { key: "access", refresh_token: "refresh", user_id: "user", team_id: "first-team" };
  const write = async (changes: Record<string, string>) =>
    writeFile(file, JSON.stringify({ "https://auth.x.ai::client": { ...entry, ...changes } }));
  try {
    await write({});
    const first = await checkGrokCredentials(file);
    assert.equal(first.status, "authenticated");
    await write({ key: "renewed-access" });
    assert.deepEqual(await checkGrokCredentials(file), first);
    await write({ team_id: "second-team" });
    assert.notDeepEqual(await checkGrokCredentials(file), first);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("Antigravity never equates process identity or unavailable credentials with a verified account", async () => {
  const oauth = async () => ({ token: { access_token: "access", refresh_token: "refresh" } });
  const running = async () => ({ pid: 1, csrfToken: "csrf", extensionPort: null, command: "server" });
  const stopped = async (): Promise<never> => {
    throw new AntigravityProbeError("not_running", "Stopped");
  };
  const failed = async (): Promise<never> => {
    throw new Error("Process lookup failed");
  };
  assert.deepEqual(await checkAntigravityCredentials(running, oauth), { status: "unverified" });
  assert.deepEqual(await checkAntigravityCredentials(failed, oauth), { status: "unverified" });
  assert.equal((await checkAntigravityCredentials(stopped, oauth)).status, "authenticated");
  assert.deepEqual(await checkAntigravityCredentials(stopped, async () => null), { status: "unverified" });
});

test("unverified cache remains visible with an explicit account warning", () => {
  const accessory = { text: "$75", tooltip: "Remaining credits" };
  assert.deepEqual(withCredentialStatus(accessory), accessory);
  const unverified = withCredentialStatus(accessory, "unverified");
  assert.match(unverified.text, /\$75.*Account unverified/);
  assert.match(unverified.tooltip, /current account could not be verified/);
});
