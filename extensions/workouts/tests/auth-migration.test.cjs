const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

const source = ts.transpileModule(readFileSync("src/api/auth.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function loadAuth(preferences, legacyToken) {
  const events = [];
  const exports = {};
  runInNewContext(source, {
    exports,
    require(name) {
      if (name === "@raycast/api") {
        return {
          getPreferenceValues: () => preferences,
          OAuth: {
            RedirectMethod: { Web: "web" },
            PKCEClient: class {
              constructor(options) {
                Object.assign(this, options);
              }
              async getTokens() {
                return this.providerId === "strava" ? legacyToken : undefined;
              }
              async removeTokens() {
                events.push(`remove:${this.providerId}`);
              }
            },
          },
        };
      }
      assert.equal(name, "./custom-auth");
      return {
        createCustomStravaProvider(client, id, secret) {
          return {
            authorize: async () => {
              events.push(`authorize:${client.providerId}`);
              if (!id || !secret) throw new Error("Personal credentials required");
              return "personal-token";
            },
          };
        },
      };
    },
  });
  return { exports, events };
}

test("shared login is removed before authorizing the personal app", async () => {
  const { exports, events } = loadAuth(
    { strava_client_id: " 123 ", strava_client_secret: " secret " },
    { accessToken: "old" },
  );
  assert.equal(await exports.provider.authorize(), "personal-token");
  assert.deepEqual(events, ["remove:strava", "authorize:strava-custom-123"]);
});

test("missing personal credentials never fall back to the shared app", async () => {
  const { exports, events } = loadAuth({}, { accessToken: "old" });
  await assert.rejects(exports.provider.authorize(), /Personal credentials required/);
  assert.equal(exports.hasStravaCredentials, false);
  assert.deepEqual(events, ["remove:strava", "authorize:strava-custom-unconfigured"]);
});

test("personal login tokens are never removed by migration", async () => {
  const { exports, events } = loadAuth({ strava_client_id: "456", strava_client_secret: "secret" });
  await exports.provider.authorize();
  assert.deepEqual(events, ["authorize:strava-custom-456"]);
});
