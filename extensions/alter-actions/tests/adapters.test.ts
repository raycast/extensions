import assert from "node:assert/strict";
import { test } from "node:test";
import { dispatchAction } from "../src/dispatch";
import {
  MAX_INPUT_LENGTH,
  buildActionUrl,
  fencedInputPreview,
  normalizeCallback,
  parseStore,
  removeAction,
  serializeActions,
  upsertAction,
} from "../src/model";

const action = {
  id: "test-action-1",
  name: "Disposable Echo",
  callbackUrl: "alter://action/disposable-echo",
};

test("official Alter callback shapes normalize and copied example input is removed", () => {
  assert.equal(
    normalizeCallback(" alter://action/ask-web?input=sample+query "),
    "alter://action/ask-web",
  );
  assert.equal(
    normalizeCallback("alter://action/business-strategist-gpt"),
    "alter://action/business-strategist-gpt",
  );
  assert.equal(
    normalizeCallback("alter://action/413228e6-951a-4eb6-9a4f-d28d512667a3"),
    "alter://action/413228e6-951a-4eb6-9a4f-d28d512667a3",
  );
});

test("URL input round-trips punctuation, URL-like content, Unicode, and line breaks exactly", () => {
  const input =
    "A&B? # 100% + café 中文 🦊\nhttps://example.test/?x=1&y=2\nsecond line";
  const result = new URL(
    buildActionUrl("alter://action/disposable-echo?input=old", input),
  );
  assert.equal(result.protocol, "alter:");
  assert.equal(result.hostname, "action");
  assert.equal(result.searchParams.get("input"), input);
  assert.equal([...result.searchParams.keys()].length, 1);
  assert.equal(result.hash, "");
});

test("no-input actions omit the input parameter and whitespace input is preserved", () => {
  assert.equal(buildActionUrl(action.callbackUrl, ""), action.callbackUrl);
  assert.equal(
    new URL(buildActionUrl(action.callbackUrl, "  ")).searchParams.get("input"),
    "  ",
  );
});

test("input preview preserves whitespace and cannot break out of its text fence", () => {
  const input =
    "  tabs\there\n```\n# heading\n<img src='https://example.test'>\n````\n";
  const preview = fencedInputPreview(input);
  assert.equal(preview, `\`\`\`\`\`text\n${input}\n\`\`\`\`\``);
});

test("invalid callbacks cannot switch destinations or inject callback execution", () => {
  const invalid = [
    "https://example.test/action/run",
    "file:///etc/passwd",
    "alter://evil/run",
    "alter://user@action/run",
    "alter://action:99/run",
    "alter://action/run#fragment",
    "alter://action/run?x-success=https://example.test",
    "alter://action/run?input=a&input=b",
    "alter://action/run?Input=a",
    "alter://action/",
    "alter://action/run/other",
    "alter://action/run%2Fother",
    "alter://action/../run",
    "alter://action/run name",
    "alter://action/run\n?input=secret",
    "alter://action/run;other",
  ];
  for (const callback of invalid)
    assert.throws(() => normalizeCallback(callback), Error, callback);
});

test("callback length and encoded Unicode inputs stay within explicit URL limits", () => {
  assert.throws(
    () => buildActionUrl(action.callbackUrl, "a".repeat(MAX_INPUT_LENGTH + 1)),
    /too long/,
  );
  assert.throws(
    () => buildActionUrl(action.callbackUrl, "中".repeat(8_000)),
    /encoded input is too long/,
  );
  assert.throws(
    () => normalizeCallback(`alter://action/run?input=${"a".repeat(1_024)}`),
    /1,024/,
  );
});

test("storage survives create, edit, serialize, reload, and delete", () => {
  const created = upsertAction([], action);
  const edited = upsertAction(created, { ...action, name: "Echo Text" });
  assert.deepEqual(parseStore(serializeActions(edited)).actions, [
    { ...action, name: "Echo Text" },
  ]);
  assert.deepEqual(removeAction(edited, action.id), []);
  assert.deepEqual(parseStore(undefined), { version: 1, actions: [] });
});

test("malformed records fail closed instead of silently clearing saved data", () => {
  const invalid: unknown[] = [
    null,
    [],
    { version: 2, actions: [] },
    { version: 1, actions: "array" },
    { version: 1, actions: [{ ...action, name: "" }] },
    { version: 1, actions: [{ ...action, name: "unsafe\nname" }] },
    { version: 1, actions: [{ ...action, id: "../bad" }] },
    {
      version: 1,
      actions: [{ ...action, callbackUrl: "https://example.test" }],
    },
    { version: 1, actions: [action, action] },
    { version: 1, actions: [null] },
  ];
  for (const value of invalid)
    assert.throws(() => parseStore(JSON.stringify(value)));
  assert.throws(() => parseStore("not-json"), /unreadable/);
  assert.throws(() => parseStore(42 as unknown as string), /stored as text/);
  assert.throws(() => parseStore("a".repeat(200_001)), /size/);
});

test("storage is bounded to prevent runaway growth", () => {
  const many = Array.from({ length: 100 }, (_, index) => ({
    ...action,
    id: `test-${index}`,
  }));
  assert.equal(parseStore(serializeActions(many)).actions.length, 100);
  assert.throws(() => upsertAction(many, { ...action, id: "test-101" }), /100/);
  assert.throws(() =>
    parseStore(
      JSON.stringify({
        version: 1,
        actions: [...many, { ...action, id: "extra" }],
      }),
    ),
  );
});

test("dispatch sends one validated URL explicitly to the official Alter app", async () => {
  const opened: { url: string; path: string }[] = [];
  await dispatchAction(action.callbackUrl, "Hello & goodbye 🦊", {
    async getApplications() {
      return [
        {
          name: "Alter",
          path: "/Applications/Alter.app",
          bundleId: "com.wearedevx.alter",
        },
      ];
    },
    async open(url, path) {
      opened.push({ url, path });
    },
  });
  assert.equal(opened.length, 1);
  assert.equal(opened[0].path, "/Applications/Alter.app");
  assert.equal(
    new URL(opened[0].url).searchParams.get("input"),
    "Hello & goodbye 🦊",
  );
});

test("missing Alter, unsupported URLs, and OS opening failures never produce a false handoff", async () => {
  let called = false;
  const missing = {
    getApplications: async () => [],
    open: async () => {
      called = true;
    },
  };
  await assert.rejects(
    dispatchAction(action.callbackUrl, "input", missing),
    /Install Alter/,
  );
  await assert.rejects(
    dispatchAction("https://example.test", "input", missing),
    /Only alter/,
  );
  assert.equal(called, false);
  await assert.rejects(
    dispatchAction(action.callbackUrl, "input", {
      getApplications: async () => [
        {
          name: "Alter",
          path: "/Applications/Alter.app",
          bundleId: "other.app",
        },
      ],
      open: async () => {
        called = true;
      },
    }),
    /Install Alter/,
  );
  assert.equal(called, false);
  await assert.rejects(
    dispatchAction(action.callbackUrl, "input", {
      getApplications: async () => [
        {
          name: "Alter",
          path: "/Applications/Alter.app",
          bundleId: "com.wearedevx.alter",
        },
      ],
      open: async () => {
        throw new Error("OS rejected callback");
      },
    }),
    /OS rejected/,
  );
});
