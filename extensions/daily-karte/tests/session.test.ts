import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { authorizeGoogle, firebaseSession, readConfig } from "../src/lib/session";
import { requestJSON, ServiceError } from "../src/lib/http";
import { APP_CONFIG } from "../src/service";

const config = readConfig({
  projectId: "demo-daily-karte",
  clientId: "123-example.apps.googleusercontent.com",
});
function oauth(saved?: object) {
  const stored: object[] = [];
  const authorizations: { clientId: string }[] = [];
  let removed = false;
  const client = {
    getTokens: async () => saved,
    setTokens: async (value: object) => {
      stored.push(value);
    },
    removeTokens: async () => {
      removed = true;
    },
    authorizationRequest: async (options: { clientId: string }) => {
      authorizations.push(options);
      return {
        codeVerifier: "test-verifier",
        redirectURI: "com.raycast:/oauth",
        clientId: options.clientId,
      };
    },
    authorize: async () => ({ authorizationCode: "test-code" }),
  } as unknown as Parameters<typeof authorizeGoogle>[0];
  return { client, stored, authorizations, removed: () => removed };
}
test("The official service starts Google authorization without required user configuration.", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(manifest.preferences, undefined);
  const service = readConfig(APP_CONFIG);
  assert.equal(new URL(service.website).hostname, `${APP_CONFIG.projectId}.web.app`);
  const h = oauth();
  const request = (async (_url: string, options: RequestInit) => {
    const params = options.body as URLSearchParams;
    assert.equal(params.get("client_id"), service.clientId);
    assert.equal(params.get("code_verifier"), "test-verifier");
    return { access_token: "test-access", expires_in: 3600 };
  }) as typeof requestJSON;
  assert.equal(await authorizeGoogle(h.client, service.clientId, request), "test-access");
  assert.equal(h.authorizations[0].clientId, service.clientId);
});
test("Invalid application configuration fails without asking users for developer IDs.", () => {
  assert.throws(
    () =>
      readConfig({
        projectId: "project/elsewhere",
        clientId: config.clientId,
      }),
    /sign-in is temporarily unavailable/,
  );
  assert.throws(
    () =>
      readConfig({
        projectId: config.projectId,
        clientId: "https://elsewhere.invalid",
      }),
    /sign-in is temporarily unavailable/,
  );
});
test("Valid OAuth sessions are reused without another network request.", async () => {
  const h = oauth({ accessToken: "test-access", isExpired: () => false });
  const request = (() => assert.fail("This session must not be refreshed.")) as typeof requestJSON;
  assert.equal(await authorizeGoogle(h.client, config.clientId, request), "test-access");
});
test("Refreshes retain the previous refresh value when Google omits it.", async () => {
  const h = oauth({
    accessToken: "test-access",
    refreshToken: "test-refresh",
    isExpired: () => true,
  });
  const request = (async () => ({
    access_token: "new-access",
    expires_in: 3600,
  })) as typeof requestJSON;
  assert.equal(await authorizeGoogle(h.client, config.clientId, request), "new-access");
  assert.equal((h.stored[0] as { refresh_token: string }).refresh_token, "test-refresh");
});
test("Only an invalid grant clears the stored OAuth session.", async () => {
  for (const code of ["invalid_grant", "UNAVAILABLE"]) {
    const h = oauth({
      accessToken: "test-access",
      refreshToken: "test-refresh",
      isExpired: () => true,
    });
    let count = 0;
    const request = (async () => {
      if (++count === 1) throw new ServiceError(code);
      return { access_token: "new-access", expires_in: 3600 };
    }) as typeof requestJSON;
    if (code === "invalid_grant") assert.equal(await authorizeGoogle(h.client, config.clientId, request), "new-access");
    else await assert.rejects(authorizeGoogle(h.client, config.clientId, request), /unavailable/);
    assert.equal(h.removed(), code === "invalid_grant");
  }
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
