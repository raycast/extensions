require("./load.cjs");
const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const os = require("node:os");
const { setLanguage, uiLanguage, t } = require("../src/i18n.ts");
const { conversationMarkdown } = require("../src/chat-text.ts");
const {
  parseLibrary,
  conversationTitle,
  filterSessions,
} = require("../src/conversations.ts");

afterEach(() => setLanguage("en"));

function systemLocale(context, initial, host = "win32") {
  context.mock.method(os, "platform", () => host);
  let locale = initial;
  const original = Intl.DateTimeFormat.prototype.resolvedOptions;
  context.mock.method(
    Intl.DateTimeFormat.prototype,
    "resolvedOptions",
    function () {
      return { ...original.call(this), locale };
    },
  );
  return (value) => {
    locale = value;
  };
}

function macLanguage(context, read, locale = "en-US") {
  systemLocale(context, locale, "darwin");
  const calls = [];
  context.mock.method(childProcess, "execFileSync", (command, args) => {
    calls.push([command, args]);
    return read(args[1]);
  });
  const filename = require.resolve("../src/i18n.ts");
  const saved = require.cache[filename];
  delete require.cache[filename];
  const actual = require(filename);
  context.after(() => {
    require.cache[filename] = saved;
  });
  return { ...actual, calls };
}

test("macOS follows the Raycast app language before the global language and formatting locale", (context) => {
  const mac = macLanguage(context, () => '(\n    "zh-Hant-HK"\n)');
  for (const value of ["system", undefined, null, "system"]) {
    assert.equal(mac.setLanguage(value), "zh-TW");
    assert.equal(mac.t("CLI Settings"), "CLI 設定");
  }
  assert.deepEqual(mac.calls, [
    ["/usr/bin/defaults", ["read", "com.raycast.macos", "AppleLanguages"]],
  ]);
});

test("macOS uses the first global preferred language when there is no Raycast override and reads it only once", (context) => {
  const mac = macLanguage(context, (domain) => {
    if (domain === "com.raycast.macos") throw new Error("No app override");
    return '(\n    "zh-Hans-US",\n    en\n)';
  });
  assert.equal(mac.setLanguage("system"), "zh-CN");
  assert.equal(mac.t("CLI Settings"), "CLI 设置");
  assert.equal(mac.setLanguage("en"), "en");
  assert.equal(mac.setLanguage("system"), "zh-CN");
  assert.deepEqual(mac.calls, [
    ["/usr/bin/defaults", ["read", "com.raycast.macos", "AppleLanguages"]],
    ["/usr/bin/defaults", ["read", "-g", "AppleLanguages"]],
  ]);
});

test("macOS manual language choices do not read application or system preferences", (context) => {
  const mac = macLanguage(context, () => {
    throw new Error("Unexpected preferences read");
  });
  for (const value of ["en", "zh-CN", "zh-TW"]) {
    assert.equal(mac.setLanguage(value), value);
  }
  assert.deepEqual(mac.calls, []);
});

test("macOS falls back to Intl when app preferences are absent and the global list is empty", (context) => {
  const mac = macLanguage(
    context,
    (domain) => {
      if (domain === "com.raycast.macos") throw new Error("No app override");
      return "(\n)";
    },
    "zh-TW",
  );
  assert.equal(mac.setLanguage("system"), "zh-TW");
  assert.equal(mac.setLanguage("system"), "zh-TW");
  assert.equal(mac.calls.length, 2);
});

test("an unsupported macOS app language uses English without replacing it with a global Chinese preference", (context) => {
  const mac = macLanguage(context, (domain) =>
    domain === "com.raycast.macos" ? "(fr)" : '("zh-Hans")',
  );
  assert.equal(mac.setLanguage("system"), "en");
  assert.equal(mac.calls.length, 1);
});

test("Windows uses Intl without starting macOS preference commands", (context) => {
  systemLocale(context, "zh-CN");
  const read = context.mock.method(childProcess, "execFileSync", () => {
    throw new Error("Unexpected macOS command");
  });
  assert.equal(setLanguage("system"), "zh-CN");
  assert.equal(read.mock.callCount(), 0);
});

test("language selection accepts explicit supported values and invalid nonempty settings fall back to English", (context) => {
  systemLocale(context, "zh-CN");
  for (const value of ["auto", "de", {}, "EN"]) {
    assert.equal(setLanguage(value), "en");
    assert.equal(uiLanguage(), "en");
    assert.equal(t("CLI Settings"), "CLI Settings");
  }
  assert.equal(setLanguage("zh-CN"), "zh-CN");
  assert.equal(t("CLI Settings"), "CLI 设置");
  assert.equal(setLanguage("zh-TW"), "zh-TW");
  assert.equal(t("CLI Settings"), "CLI 設定");
  assert.equal(t("Save and Start Chatting"), "儲存並開始對話");
});

test("system and absent language settings follow real locale scripts and unsupported locales fall back to English", (context) => {
  const changeLocale = systemLocale(context, "en-US");
  for (const [locale, expected, label] of [
    ["zh-CN", "zh-CN", "CLI 设置"],
    ["zh-TW", "zh-TW", "CLI 設定"],
    ["zh-HK", "zh-TW", "CLI 設定"],
    ["zh-Hant", "zh-TW", "CLI 設定"],
    ["zh-Hans-HK", "zh-CN", "CLI 设置"],
    ["zh-Hant-CN", "zh-TW", "CLI 設定"],
    ["en-US", "en", "CLI Settings"],
    ["fr-FR", "en", "CLI Settings"],
  ]) {
    changeLocale(locale);
    for (const value of ["system", undefined, null]) {
      assert.equal(setLanguage(value), expected, `${locale}: ${String(value)}`);
      assert.equal(uiLanguage(), expected);
      assert.equal(t("CLI Settings"), label);
    }
  }
});

test("manual language choices override the system while raw conversation and CLI content stays intact", (context) => {
  const changeLocale = systemLocale(context, "zh-TW");
  const messages = Object.freeze([
    Object.freeze({ id: "user", role: "user", content: "CLI Settings" }),
    Object.freeze({
      id: "assistant",
      role: "assistant",
      content: "Model: gpt-6.1-sol\nCLI Settings",
    }),
  ]);
  const original = JSON.stringify(messages);
  for (const locale of ["zh-CN", "zh-TW", "en-US"]) {
    changeLocale(locale);
    for (const [selection, label] of [
      ["en", "CLI Settings"],
      ["zh-CN", "CLI 设置"],
      ["zh-TW", "CLI 設定"],
    ]) {
      assert.equal(setLanguage(selection), selection);
      assert.equal(uiLanguage(), selection);
      assert.equal(t("CLI Settings"), label);
      const rendered = conversationMarkdown(
        messages,
        "/assets",
        "",
        "CLI raw error",
        "Gemini",
      );
      assert.match(rendered, /> CLI Settings/);
      assert.match(rendered, /Model: gpt-6\.1-sol *\nCLI Settings/);
      assert.match(rendered, /CLI raw error/);
      assert.equal(JSON.stringify(messages), original);
    }
  }
});

test("placeholder substitution preserves opaque values, missing tokens, and unknown diagnostics", () => {
  setLanguage("zh-CN");
  assert.equal(
    t("Connecting to {provider}…", { provider: "Gemini {provider} $&" }),
    "正在连接 Gemini {provider} $&…",
  );
  assert.equal(t("Connecting to {provider}…"), "正在连接 {provider}…");
  assert.equal(
    t("backend ERR_UNSUPPORTED_CLIENT: {detail}", {
      detail: "user's raw diagnostic",
    }),
    "backend ERR_UNSUPPORTED_CLIENT: user's raw diagnostic",
  );
  assert.equal(t("{constructor} {count}", { count: 0 }), "{constructor} 0");
});

test("command subtitles follow the selected language with provider names intact", () => {
  for (const [language, hub, chat] of [
    ["en", "Local AI CLIs", "Chat with your local Codex CLI"],
    ["zh-CN", "本机 AI CLI", "与本机 Codex CLI 对话"],
    ["zh-TW", "本機 AI CLI", "與本機 Codex CLI 對話"],
  ]) {
    setLanguage(language);
    assert.equal(t("Local AI CLIs"), hub);
    assert.equal(
      t("Chat with your local {provider} CLI", { provider: "Codex" }),
      chat,
    );
  }
});

test("localized renderer translates interface copy while preserving conversation and provider text", () => {
  setLanguage("zh-TW");
  const empty = conversationMarkdown([], "/assets", "", "", "Qoder CN");
  assert.match(empty, /想聊點什麼/);
  assert.match(empty, /按 Enter 開始輸入/);
  assert.doesNotMatch(empty, /\| --- \|/);
  const messages = [
    { id: "user", role: "user", content: "CLI Settings" },
    {
      id: "assistant",
      role: "assistant",
      content: "Model: gpt-6.1-sol\n**Answer**",
    },
  ];
  const rendered = conversationMarkdown(
    messages,
    "/assets",
    "",
    "CLI raw error",
    "Gemini",
  );
  assert.match(rendered, /\*\*連線提示\*\* · CLI raw error/);
  assert.match(rendered, /CLI Settings/);
  assert.match(rendered, /Model: gpt-6.1-sol *\n\*\*Answer\*\*/);
  assert.match(rendered, /\*\*你\*\*/);
  assert.match(rendered, /\*\*Gemini\*\*/);
  assert.equal(messages[0].content, "CLI Settings");
});

test("conversation format failures remain fail-closed and use the chosen language", () => {
  const raw = '{"version":99,"sessions":[]}';
  for (const [language, expected] of [
    ["zh-CN", "无法识别对话记录格式。原始记录已保留，请勿清除扩展数据。"],
    ["zh-TW", "無法辨識對話記錄格式。原始記錄已保留，請勿清除擴充功能資料。"],
  ]) {
    setLanguage(language);
    assert.throws(() => parseLibrary(raw), { message: expected });
  }
});

test("history localizes only its generated fallback and filtering never persists the label", () => {
  const sessions = Object.freeze([
    Object.freeze({
      threadId: "draft",
      messages: Object.freeze([]),
      draft: "New Chat",
    }),
    Object.freeze({
      threadId: "title",
      title: "New Chat",
      messages: Object.freeze([]),
    }),
    Object.freeze({
      threadId: "prompt",
      messages: Object.freeze([
        Object.freeze({ id: "user", role: "user", content: "New Chat" }),
      ]),
    }),
  ]);
  const original = JSON.stringify(sessions);
  for (const [language, label] of [
    ["zh-CN", "新对话"],
    ["zh-TW", "新對話"],
  ]) {
    setLanguage(language);
    assert.equal(conversationTitle(sessions[0]), label);
    assert.equal(conversationTitle(sessions[1]), "New Chat");
    assert.equal(conversationTitle(sessions[2]), "New Chat");
    assert.deepEqual(
      filterSessions(sessions, label).map((session) => session.threadId),
      ["draft"],
    );
    assert.deepEqual(
      filterSessions(sessions, "New Chat").map((session) => session.threadId),
      ["title", "prompt"],
    );
    assert.equal(JSON.stringify(sessions), original);
  }
  setLanguage("en");
  assert.equal(conversationTitle(sessions[0]), "New Chat");
});
