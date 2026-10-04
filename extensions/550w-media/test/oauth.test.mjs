import test from "node:test";
import assert from "node:assert/strict";
import {
  createSession,
  host,
  effectiveAuthorizationRequest,
  validateRedirect,
  regionalRedirect,
  oauthDiagnostic,
} from "../src/oauth.mjs";
function fixture(region = "global", initial) {
  let tokens = initial;
  const calls = [],
    cache = new Map();
  const client = {
    getTokens: async () => tokens,
    setTokens: async (data) => {
      tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        isExpired: () => false,
      };
    },
    removeTokens: async () => {
      tokens = undefined;
    },
    authorizationRequest: async (options) => {
      assert.equal(
        options.extraParameters.ui_locales,
        region === "cn" ? "zh-CN" : "en",
      );
      return {
        redirectURI: "https://raycast.com/redirect",
        codeVerifier: "verifier",
        state: "sdk-state",
        codeChallenge: "sdk-challenge",
        toURL: () => {
          const url = new URL(options.endpoint);
          url.searchParams.set(
            "redirect_uri",
            options.extraParameters.redirect_uri,
          );
          url.searchParams.set("state", "sdk-state");
          url.searchParams.set("code_challenge", "sdk-challenge");
          return url.toString();
        },
      };
    },
    authorize: async (request) => {
      assert.equal(request.redirectURI, regionalRedirect(region));
      assert.equal(
        new URL(request.toURL()).searchParams.get("redirect_uri"),
        request.redirectURI,
      );
      assert.equal(request.state, "sdk-state");
      assert.equal(request.codeChallenge, "sdk-challenge");
      return { authorizationCode: "code" };
    },
  };
  const storage = {
    getItem: async (key) => cache.get(key),
    setItem: async (key, value) => cache.set(key, value),
  };
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    return new Response(
      url.endsWith("/register")
        ? JSON.stringify({ client_id: "public-client" })
        : url.endsWith("/revoke")
          ? ""
          : JSON.stringify({
              access_token: "access",
              refresh_token: "refresh",
              token_type: "Bearer",
              expires_in: 3600,
              resource: host + "/media-api/" + region,
            }),
    );
  };
  return {
    session: createSession({ client, storage, region, fetcher }),
    calls,
    cache,
    client,
    storage,
  };
}
test("explicit invalid resource metadata never replaces stored tokens", async () => {
  for (const resource of [null, "", false, host + "/media-api/cn"]) {
    let saved = false;
    const f = fixture();
    f.client.setTokens = async () => {
      saved = true;
    };
    const session = createSession({
      client: f.client,
      storage: f.storage,
      region: "global",
      fetcher: async (url) =>
        Response.json(
          url.endsWith("/register")
            ? { client_id: "public-client" }
            : {
                access_token: "access",
                refresh_token: "refresh",
                token_type: "Bearer",
                expires_in: 3600,
                resource,
              },
        ),
    });
    await assert.rejects(() => session.accessToken(true));
    assert.equal(saved, false);
  }
});
test("disconnect always clears native tokens when client registration is missing or unreadable", async () => {
  for (const unreadable of [false, true]) {
    const f = fixture("global", {
      accessToken: "live",
      refreshToken: "refresh",
      isExpired: () => false,
    });
    if (unreadable)
      f.storage.getItem = async () => {
        throw Error("private storage error");
      };
    await assert.rejects(
      f.session.disconnect(),
      /remote revocation not confirmed/,
    );
    assert.equal(await f.client.getTokens(), undefined);
    assert.equal(f.calls.length, 0);
  }
});
test("native PKCE, DCR and secure token storage isolate regional resources", async () => {
  for (const region of ["global", "cn"]) {
    const f = fixture(region);
    assert.equal(await f.session.accessToken(true), "access");
    const metadata = JSON.parse(f.calls[0].options.body);
    assert.equal(metadata.resource, host + "/media-api/" + region);
    assert.equal(metadata.token_endpoint_auth_method, "none");
    assert.ok(
      metadata.redirect_uris[0].startsWith(
        "https://raycast.com/redirect?packageName=550w-media",
      ),
    );
    assert.equal(f.calls[1].options.body.get("code_verifier"), "verifier");
    assert.equal(f.cache.size, 1);
    assert.equal(
      f.calls[1].options.body.get("redirect_uri"),
      metadata.redirect_uris[0],
    );
    await f.session.accessToken();
    assert.equal(f.calls.length, 2);
    await f.session.disconnect();
    assert.equal(await f.client.getTokens(), undefined);
  }
});
test("refresh preserves previous refresh token and concurrent calls share exchange", async () => {
  const f = fixture("global", {
    accessToken: "expired",
    refreshToken: "original",
    isExpired: () => true,
  });
  await Promise.all([f.session.accessToken(), f.session.accessToken()]);
  assert.equal(f.calls.filter((c) => c.url.endsWith("/token")).length, 1);
  assert.equal(f.calls[1].options.body.get("grant_type"), "refresh_token");
});
test("background requests never initiate interactive authorization", async () => {
  const f = fixture();
  await assert.rejects(f.session.accessToken(), /Connect/);
  assert.equal(f.calls.length, 0);
});
test("failed revocation clears local credentials but reports uncertainty", async () => {
  const f = fixture("global", {
    accessToken: "live",
    refreshToken: "refresh",
    isExpired: () => false,
  });
  f.cache.set("oauth-client-global", "id");
  const session = createSession({
    ...f,
    region: "global",
    fetcher: async () => {
      throw new Error("private token");
    },
  });
  await assert.rejects(session.disconnect(), /remote revocation not confirmed/);
  assert.equal(await f.client.getTokens(), undefined);
});
test("invalid or cross-region token is never stored; provider content redacted", async () => {
  const f = fixture();
  const session = createSession({
    ...f,
    region: "global",
    fetcher: async (url) =>
      new Response(
        JSON.stringify(
          url.endsWith("/register")
            ? { client_id: "id" }
            : {
                access_token: "secret",
                token_type: "Bearer",
                expires_in: 1,
                resource: host + "/media-api/cn",
              },
        ),
      ),
  });
  await assert.rejects(session.accessToken(true), /token\/failed/);
  assert.equal(await f.client.getTokens(), undefined);
});
test("effective request replaces native redirect in both object and closed-over URL", () => {
  for (const region of ["global", "cn"]) {
    const native = {
      redirectURI: "https://raycast.com/redirect",
      state: "native-state",
      codeVerifier: "verifier",
      toURL: () =>
        host +
        "/oauth2/authorize?redirect_uri=" +
        encodeURIComponent("https://raycast.com/redirect") +
        "&state=native-state",
    };
    const effective = effectiveAuthorizationRequest(native, region);
    assert.equal(effective.redirectURI, regionalRedirect(region));
    assert.equal(
      new URL(effective.toURL()).searchParams.get("redirect_uri"),
      effective.redirectURI,
    );
    assert.equal(
      new URL(effective.toURL()).searchParams.get("state"),
      native.state,
    );
    assert.equal(native.redirectURI, "https://raycast.com/redirect");
  }
});
test("callback validation rejects unsafe and other-region URLs", () => {
  for (const region of ["cn", "global"]) {
    assert.equal(
      validateRedirect(regionalRedirect(region), region),
      regionalRedirect(region),
    );
    for (const value of [
      "http://raycast.com/redirect?packageName=550w-media",
      "https://raycast.com.evil/redirect?packageName=550w-media",
      "https://user@raycast.com/redirect?packageName=550w-media",
      "https://raycast.com:443/redirect?packageName=550w-media",
      "https://raycast.com/other?packageName=550w-media",
      regionalRedirect(region === "cn" ? "global" : "cn"),
      regionalRedirect(region) + "&extra=1",
      regionalRedirect(region) + "#fragment",
    ]) {
      assert.throws(
        () => validateRedirect(value, region),
        (error) => oauthDiagnostic(error) === "callback/invalid_redirect",
      );
    }
  }
});
test("diagnostics expose only fixed stages and codes, never provider content", async () => {
  const f = fixture();
  for (const status of [400, 401, 500]) {
    const session = createSession({
      ...f,
      region: "global",
      fetcher: async () =>
        new Response("private URL token client_id secret", { status }),
    });
    await assert.rejects(
      session.accessToken(true),
      (error) => oauthDiagnostic(error) === `registration/http_${status}`,
    );
  }
  f.client.authorizationRequest = async () => {
    throw Error("https://private/?token=secret&client_id=id");
  };
  await assert.rejects(
    f.session.accessToken(true),
    (error) => oauthDiagnostic(error) === "initialization/failed",
  );
  assert.equal(
    oauthDiagnostic({ stage: "evil-secret", code: "private-client-id" }),
    "session/unconfirmed",
  );
  assert.throws(
    () =>
      effectiveAuthorizationRequest(
        { toURL: () => "https://evil/oauth2/authorize" },
        "global",
      ),
    (error) => oauthDiagnostic(error) === "callback/invalid_authorization_url",
  );
});
test("refresh responses without rotation retain native stored refresh token", async () => {
  const f = fixture("cn", {
    accessToken: "expired",
    refreshToken: "original",
    isExpired: () => true,
  });
  f.cache.set("oauth-client-cn", "id");
  const session = createSession({
    ...f,
    region: "cn",
    fetcher: async () =>
      Response.json({
        access_token: "new",
        token_type: "Bearer",
        expires_in: 3600,
      }),
  });
  assert.equal(await session.accessToken(), "new");
  assert.equal((await f.client.getTokens()).refreshToken, "original");
});
