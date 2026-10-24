const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { compileFunction } = require("node:vm");
const { test } = require("node:test");

const buildDir = path.resolve(process.env.TELEGRAM_BUILD_DIR || "dist");
const commandPath = path.join(buildDir, "tools/browse-chats.js");
const requireBuilt = createRequire(commandPath);

test("the distribution client accepts its session and recognizes Telegram users", async (t) => {
  assert.ok(fs.existsSync(commandPath), "Run ray build -e dist -o dist before testing the distribution");
  const { TelegramClient, Api, sessions } = requireBuilt("teleproto");
  const session = new sessions.StringSession("");
  session.setDC(2, "127.0.0.1", 443);
  session.authKey = { getKey: () => Buffer.alloc(256) };
  const savedSession = session.save();

  const connect = t.mock.method(TelegramClient.prototype, "connect", async () => {});
  t.mock.method(TelegramClient.prototype, "getDialogs", async () => [
    {
      id: 42n,
      entity: new Api.User({ id: 42n, firstName: "Test User" }),
      unreadCount: 0,
      pinned: false,
    },
  ]);

  const api = {
    LocalStorage: { getItem: async (key) => (key === "telegram_session" ? savedSession : undefined) },
    environment: { supportPath: buildDir },
    getPreferenceValues: () => ({ apiId: "12345", apiHash: "test-only-placeholder" }),
  };
  const command = { exports: {} };
  const load = compileFunction(fs.readFileSync(commandPath, "utf8"), [
    "require",
    "module",
    "exports",
    "__filename",
    "__dirname",
  ]);
  load(
    (id) => (id === "@raycast/api" ? api : requireBuilt(id)),
    command,
    command.exports,
    commandPath,
    path.dirname(commandPath),
  );

  const result = await command.exports.default();
  assert.equal(connect.mock.callCount(), 1);
  assert.equal(result.chats.length, 1);
  assert.equal(result.chats[0].title, "Test User");
  assert.equal(result.chats[0].type, "private");
});
