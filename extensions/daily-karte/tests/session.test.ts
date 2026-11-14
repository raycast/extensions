import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { firebaseSession, googleOptions, readConfig } from "../src/lib/session";
import { requestJSON } from "../src/lib/http";
import { APP_CONFIG } from "../src/service";

const config = readConfig({
  projectId: "demo-daily-karte",
  clientId: "123-example.apps.googleusercontent.com",
});

test("The official Google provider requires no user configuration and preserves the authorization namespace.", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(manifest.preferences, undefined);
  assert.match(manifest.description, /Requires a Google account/);
  const service = readConfig(APP_CONFIG);
  const options = googleOptions(service);
  assert.equal(new URL(service.website).hostname, `${APP_CONFIG.projectId}.web.app`);
  assert.equal(options.clientId, service.clientId);
  assert.equal(options.providerId, `${service.projectId}:${service.clientId}`);
  assert.equal(options.scope, "openid email profile");
  assert.deepEqual(options.extraParameters, { access_type: "offline", prompt: "consent select_account" });
});

test("Invalid application configuration fails without asking users for developer IDs.", () => {
  for (const invalid of [
    { ...config, projectId: "project/elsewhere" },
    { ...config, clientId: "https://elsewhere.invalid" },
  ])
    assert.throws(() => readConfig(invalid), /sign-in is temporarily unavailable/);
});

test("A different Firebase project is rejected before sending the Google assertion.", async () => {
  let count = 0;
  const request = (async () => {
    count++;
    return { projectId: "other-project", apiKey: "test-config" };
  }) as typeof requestJSON;
  await assert.rejects(firebaseSession(config, "test-access", request), /does not match/);
  assert.equal(count, 1);
});

test("The Firebase exchange uses the SDK's Google assertion and returns a validated account session.", async () => {
  let calls = 0;
  const before = Date.now();
  const request = (async (url: string, options?: RequestInit) => {
    if (++calls === 1) {
      assert.equal(url, `${config.website}/__/firebase/init.json`);
      return { projectId: config.projectId, apiKey: "test-config" };
    }
    assert.equal(new URL(url).hostname, "identitytoolkit.googleapis.com");
    const body = JSON.parse(String(options?.body));
    assert.equal(body.requestUri, config.website);
    assert.equal(body.returnSecureToken, true);
    const assertion = new URLSearchParams(body.postBody);
    assert.equal(assertion.get("providerId"), "google.com");
    assert.equal(assertion.get("access_token"), "test-access");
    return { localId: "test-user", idToken: "test-firebase-session", email: "test@example.invalid", expiresIn: "3600" };
  }) as typeof requestJSON;
  const session = await firebaseSession(config, "test-access", request);
  assert.equal(session.uid, "test-user");
  assert.equal(session.email, "test@example.invalid");
  assert.equal(session.idToken, "test-firebase-session");
  assert.ok(session.expiresAt >= before + 3600000);
  assert.equal(calls, 2);
});

test("Malformed Firebase accounts and expiration values cannot produce a session.", async () => {
  for (const invalid of [{ localId: "../other-user" }, { idToken: "" }, { expiresIn: "0" }, { expiresIn: "NaN" }]) {
    let calls = 0;
    const request = (async () =>
      ++calls === 1
        ? { projectId: config.projectId, apiKey: "test-config" }
        : { localId: "test-user", idToken: "test-session", expiresIn: "3600", ...invalid }) as typeof requestJSON;
    await assert.rejects(firebaseSession(config, "test-access", request), /valid sign-in session/);
  }
});

test("Firebase account-linking requests are surfaced instead of entering another account.", async () => {
  let calls = 0;
  const request = (async () =>
    ++calls === 1
      ? { projectId: config.projectId, apiKey: "test-config" }
      : { needConfirmation: true }) as typeof requestJSON;
  await assert.rejects(firebaseSession(config, "test-access", request), /already linked/);
});
