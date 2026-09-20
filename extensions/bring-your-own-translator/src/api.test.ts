import assert from "node:assert/strict";
import { test } from "node:test";
import { translate, type Config } from "./api.ts";

test("provider requests, prompts, validation and failures", async () => {
  const original = globalThis.fetch;
  const config: Config = {
    provider: "openai",
    url: "https://example.com/v1/chat/completions",
    model: "test-model",
    apiKey: "test-key",
    target: "中文",
    prompt: "Translate into {{target}}",
  };
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(init!.body as string);
    const headers = init!.headers as Record<string, string>;
    assert.equal(init!.redirect, "error");
    assert.equal(body.model, "test-model");
    if (body.system) {
      assert.equal(body.system, "Translate into 中文");
      assert.equal(headers["x-api-key"], "test-key");
      assert.equal(headers["anthropic-version"], "2023-06-01");
      assert.deepEqual(body.messages, [{ role: "user", content: "Hello" }]);
      return Response.json({ content: [{ type: "text", text: "你好" }] });
    }
    assert.equal(headers.Authorization, "Bearer test-key");
    assert.deepEqual(body.messages, [
      { role: "system", content: "Translate into 中文" },
      { role: "user", content: "Hello" },
    ]);
    return Response.json({ choices: [{ message: { content: "你好" } }] });
  };
  try {
    assert.equal(
      await translate(
        {
          ...config,
          url: " \t" + config.url + "\n",
          apiKey: "\u200b test-key \t",
          model: " test-model\n",
          target: "\t中文 ",
          prompt: "\uFEFF Translate into {{target}} \n",
        },
        "\t Hello \n",
      ),
      "你好",
    );
    assert.equal(
      await translate({ ...config, provider: "anthropic" }, "Hello"),
      "你好",
    );
    await assert.rejects(
      translate({ ...config, url: "http://example.com" }, "Hello"),
      /HTTPS/,
    );
    await assert.rejects(translate(config, "  "), /原文/);
    await assert.rejects(
      translate({ ...config, url: "https://user:secret@example.com" }, "Hello"),
      /凭证/,
    );
    assert.equal(calls, 2);
    globalThis.fetch = async () =>
      new Response("sensitive upstream content", { status: 401 });
    await assert.rejects(translate(config, "Hello"), /HTTP 401/);
    globalThis.fetch = async () =>
      Response.json({
        choices: [{ finish_reason: "length", message: { content: "partial" } }],
      });
    await assert.rejects(translate(config, "Hello"), /输出上限/);
    globalThis.fetch = async () => Response.json({ choices: [] });
    await assert.rejects(translate(config, "Hello"), /未返回译文/);
  } finally {
    globalThis.fetch = original;
  }
});

test("clipboard text or manual-input fallback", async () => {
  const { readClipboardText } = await import("./clipboard.ts");
  assert.equal(
    await readClipboardText(async () => ({ text: "Hello\nworld" })),
    "Hello\nworld",
  );
  for (const content of [
    {},
    { text: "" },
    { text: " \n " },
    { text: "photo.png", file: "/tmp/photo.png" },
  ]) {
    assert.equal(await readClipboardText(async () => content), undefined);
  }
  assert.equal(
    await readClipboardText(async () => {
      throw new Error("unavailable");
    }),
    undefined,
  );
});

test("selection takes priority, then clipboard, then manual input", async () => {
  const { readInputText } = await import("./clipboard.ts");
  let clipboardReads = 0;
  const clipboard = async () => {
    clipboardReads++;
    return { text: "clipboard" };
  };
  assert.deepEqual(
    await readInputText(async () => "selected\ntext", clipboard),
    { text: "selected\ntext", source: "selection" },
  );
  assert.equal(clipboardReads, 0);
  assert.deepEqual(await readInputText(async () => "  ", clipboard), {
    text: "clipboard",
    source: "clipboard",
  });
  const unavailable = async (): Promise<string> => {
    throw new Error("selection inaccessible");
  };
  assert.deepEqual(await readInputText(unavailable, clipboard), {
    text: "clipboard",
    source: "clipboard",
  });
  assert.equal(
    await readInputText(unavailable, async () => ({
      text: "image.png",
      file: "/tmp/image.png",
    })),
    undefined,
  );
  assert.equal(
    await readInputText(unavailable, async () => {
      throw new Error("clipboard inaccessible");
    }),
    undefined,
  );
});

test("each invocation captures fresh input with a separate session", async () => {
  const { createTranslationContext } = await import("./clipboard.ts");
  let selection = "A";
  const read = async () => selection;
  const clipboard = async () => ({ text: "fallback" });
  const a = await createTranslationContext(read, clipboard);
  selection = "B";
  const b = await createTranslationContext(read, clipboard);
  assert.equal(a.input?.text, "A");
  assert.equal(b.input?.text, "B");
  assert.notEqual(a.requestId, b.requestId);
  const again = await createTranslationContext(read, clipboard);
  assert.notEqual(b.requestId, again.requestId);
  const empty = await createTranslationContext(
    async () => "",
    async () => ({}),
  );
  assert.equal(empty.input, undefined);
});

test("launcher replaces the old view after capturing each selection", async () => {
  const { readFileSync } = await import("node:fs");
  const { runInNewContext } = await import("node:vm");
  const ts = await import("typescript");
  const clipboardModule = await import("./clipboard.ts");
  let selection = "A";
  const events: string[] = [];
  const contexts: { requestId: string; input?: { text: string } }[] = [];
  const api = {
    Clipboard: { read: async () => ({}) },
    LaunchType: { UserInitiated: "userInitiated" },
    Toast: { Style: { Failure: "failure" } },
    getSelectedText: async () => {
      events.push(`read:${selection}`);
      return selection;
    },
    popToRoot: async () => {
      events.push("reset");
    },
    launchCommand: async (options: { context: (typeof contexts)[number] }) => {
      events.push("launch");
      contexts.push(options.context);
    },
    showToast: async () => {
      assert.fail("launcher failed");
    },
  };
  const exports: { default?: () => Promise<void> } = {};
  const compiled = ts.transpileModule(
    readFileSync("src/translate.ts", "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  runInNewContext(compiled, {
    exports,
    require: (name: string) =>
      name === "@raycast/api" ? api : clipboardModule,
  });
  await exports.default!();
  selection = "B";
  await exports.default!();
  assert.deepEqual(events, [
    "read:A",
    "reset",
    "launch",
    "read:B",
    "reset",
    "launch",
  ]);
  assert.deepEqual(
    contexts.map((context) => context.input?.text),
    ["A", "B"],
  );
  assert.notEqual(contexts[0].requestId, contexts[1].requestId);
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(
    manifest.commands.find(
      (command: { name: string }) => command.name === "translate",
    ).mode,
    "no-view",
  );
});

test("edge cleanup preserves meaningful text and language choices are complete", async () => {
  const { cleanInput } = await import("./input.ts");
  const { readFileSync } = await import("node:fs");
  assert.equal(
    cleanInput("\u200b\t \u0000Hello\n  world!\u2060\n"),
    "Hello\n  world!",
  );
  assert.equal(cleanInput('  "Hello!"  '), '"Hello!"');
  assert.equal(cleanInput("\u200b\t\uFEFF"), "");
  const languages = JSON.parse(readFileSync("src/languages.json", "utf8"));
  assert.equal(languages.length, 185);
  assert.equal(
    new Set(languages.map((language: { code: string }) => language.code)).size,
    185,
  );
  assert.equal(
    new Set(languages.map((language: { value: string }) => language.value))
      .size,
    185,
  );
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  assert.deepEqual(
    manifest.preferences.find((p: { name: string }) => p.name === "target")
      .data,
    languages.map(({ title, value }: { title: string; value: string }) => ({
      title,
      value,
    })),
  );
});

test("saved multiline prompt overrides legacy settings and falls back safely", async () => {
  const { readFileSync } = await import("node:fs");
  const { runInNewContext } = await import("node:vm");
  const { createRequire } = await import("node:module");
  const ts = await import("typescript");
  const input = await import("./input.ts");
  const apiModule = await import("./api.ts");
  const require = createRequire(process.cwd() + "/package.json");
  let saved: string | undefined;
  const exports: { loadPrompt?: () => Promise<string> } = {};
  const api = {
    LocalStorage: { getItem: async () => saved },
    getPreferenceValues: () => ({ prompt: "legacy {{target}}" }),
  };
  const compiled = ts.transpileModule(
    readFileSync("src/edit-prompt.tsx", "utf8"),
    {
      fileName: "edit-prompt.tsx",
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  runInNewContext(compiled, {
    exports,
    require: (name: string) =>
      name === "@raycast/api"
        ? api
        : name === "./input"
          ? input
          : name === "./api"
            ? apiModule
            : require(name),
  });
  assert.equal(await exports.loadPrompt!(), "legacy {{target}}");
  saved = "\tTranslate {{target}}\nPreserve code.\n";
  assert.equal(
    await exports.loadPrompt!(),
    "Translate {{target}}\nPreserve code.",
  );
  saved = " \t";
  assert.equal(await exports.loadPrompt!(), apiModule.defaultPrompt);
});
