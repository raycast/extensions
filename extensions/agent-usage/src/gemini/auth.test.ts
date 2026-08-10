import test from "node:test";
import assert from "node:assert/strict";

test("extractGeminiOAuthClientCredentials parses oauth2.js constants", async () => {
  const { extractGeminiOAuthClientCredentials } = await import("./auth");

  const credentials = extractGeminiOAuthClientCredentials(`
    const OAUTH_CLIENT_ID = "client-id-123";
    const OAUTH_CLIENT_SECRET = "client-secret-456";
  `);

  assert.deepEqual(credentials, {
    clientId: "client-id-123",
    clientSecret: "client-secret-456",
  });
});

test("resolveGeminiOAuthClientCredentials falls back to env credentials when oauth2.js content is unavailable", async () => {
  const { resolveGeminiOAuthClientCredentials } = await import("./auth");

  const originalClientId = process.env.GEMINI_OAUTH_CLIENT_ID;
  const originalClientSecret = process.env.GEMINI_OAUTH_CLIENT_SECRET;

  process.env.GEMINI_OAUTH_CLIENT_ID = "env-client-id";
  process.env.GEMINI_OAUTH_CLIENT_SECRET = "env-client-secret";

  try {
    const credentials = resolveGeminiOAuthClientCredentials(null);

    assert.deepEqual(credentials, {
      clientId: "env-client-id",
      clientSecret: "env-client-secret",
    });
  } finally {
    if (originalClientId === undefined) {
      delete process.env.GEMINI_OAUTH_CLIENT_ID;
    } else {
      process.env.GEMINI_OAUTH_CLIENT_ID = originalClientId;
    }

    if (originalClientSecret === undefined) {
      delete process.env.GEMINI_OAUTH_CLIENT_SECRET;
    } else {
      process.env.GEMINI_OAUTH_CLIENT_SECRET = originalClientSecret;
    }
  }
});

test("resolveGeminiOAuthClientCredentials returns null when neither oauth2.js nor env credentials are available", async () => {
  const { resolveGeminiOAuthClientCredentials } = await import("./auth");

  const originalClientId = process.env.GEMINI_OAUTH_CLIENT_ID;
  const originalClientSecret = process.env.GEMINI_OAUTH_CLIENT_SECRET;

  delete process.env.GEMINI_OAUTH_CLIENT_ID;
  delete process.env.GEMINI_OAUTH_CLIENT_SECRET;

  try {
    const credentials = resolveGeminiOAuthClientCredentials(null);

    assert.equal(credentials, null);
  } finally {
    if (originalClientId === undefined) {
      delete process.env.GEMINI_OAUTH_CLIENT_ID;
    } else {
      process.env.GEMINI_OAUTH_CLIENT_ID = originalClientId;
    }

    if (originalClientSecret === undefined) {
      delete process.env.GEMINI_OAUTH_CLIENT_SECRET;
    } else {
      process.env.GEMINI_OAUTH_CLIENT_SECRET = originalClientSecret;
    }
  }
});

test("resolveGeminiAuthType supports nested settings.security.auth.selectedType", async () => {
  const { resolveGeminiAuthType } = await import("./auth");

  const authType = resolveGeminiAuthType({
    security: {
      auth: {
        selectedType: "oauth-personal",
      },
    },
  });

  assert.equal(authType, "oauth-personal");
});
