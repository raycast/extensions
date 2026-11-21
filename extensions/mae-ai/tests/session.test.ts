import assert from "node:assert/strict";
import test from "node:test";
import { conversationMessages, needsLanguage, Turn } from "../src/lib/session";
import {
  builtInTools,
  createToolFromTemplate,
  mergeTools,
  toolPlaceholder,
} from "../src/lib/tools";

test("follow-up instructions retain the original input and assistant response in the same session", () => {
  const tool = builtInTools.find((item) => item.id === "polisher")!;
  const turns: Turn[] = [
    {
      id: 1,
      query: "We was going to discuss it.",
      answer: "We were going to discuss it.",
      model: "test",
      status: "complete",
    },
  ];
  assert.deepEqual(
    conversationMessages(tool, turns, "Make it more formal.", ""),
    [
      { role: "system", content: tool.prompt },
      { role: "user", content: turns[0].query },
      { role: "assistant", content: turns[0].answer },
      { role: "user", content: "Make it more formal." },
    ],
  );
  assert.equal(conversationMessages(tool, [], "New session", "").length, 2);
});

test("empty failed replies are excluded, but a stopped partial reply can be continued", () => {
  const turns: Turn[] = [
    { id: 1, query: "Failed", answer: "", model: "test", status: "error" },
    {
      id: 2,
      query: "Tell me more",
      answer: "A partial reply",
      model: "test",
      status: "stopped",
    },
  ];
  const messages = conversationMessages(
    builtInTools[0],
    turns,
    "Continue.",
    "",
  );
  assert.equal(messages.length, 4);
  assert.equal(messages[1].content, "Tell me more");
  assert.equal(messages[2].content, "A partial reply");
});

test("translation requires an explicit command-scoped language and also respects a custom prompt", () => {
  const translator = builtInTools.find((item) => item.id === "translator")!;
  assert.equal(translator.targetLanguage, undefined);
  assert.throws(
    () => conversationMessages(translator, [], "hello", ""),
    /Choose a target language/,
  );
  assert.match(
    conversationMessages(translator, [], "hello", "Japanese")[0].content,
    /Japanese/,
  );
  const custom = {
    ...translator,
    prompt: "Translate naturally, with a formal tone.",
  };
  assert.match(
    conversationMessages(custom, [], "hello", "French")[0].content,
    /Translate into French/,
  );
});

test("each built-in supplies defaults while custom prompts and placeholders survive a settings migration", () => {
  for (const tool of builtInTools) {
    assert.ok(tool.prompt && tool.placeholder && tool.followUpPlaceholder);
  }
  const legacy = { id: "polisher", title: "My Polish", prompt: "Be concise." };
  const merged = mergeTools([legacy]).find((tool) => tool.id === "polisher")!;
  assert.equal(merged.prompt, "Be concise.");
  assert.ok(merged.placeholder);
  const customized = {
    ...merged,
    placeholder: "Paste your draft",
    followUpPlaceholder: "Refine it further",
  };
  assert.equal(toolPlaceholder(customized, false), "Paste your draft");
  assert.equal(toolPlaceholder(customized, true), "Refine it further");
});

test("template-created commands are independent and translator templates retain language behavior", () => {
  const first = createToolFromTemplate("polisher", "custom-1");
  const second = createToolFromTemplate("polisher", "custom-2");
  first.prompt = "My own prompt";
  assert.notEqual(first.id, second.id);
  assert.notEqual(first.prompt, second.prompt);
  assert.equal(
    second.prompt,
    builtInTools.find((tool) => tool.id === "polisher")!.prompt,
  );
  assert.ok(second.placeholder && second.followUpPlaceholder);
  const translator = createToolFromTemplate("translator", "custom-translate");
  translator.prompt = "Translate naturally.";
  assert.equal(needsLanguage(translator), true);
  assert.throws(
    () => conversationMessages(translator, [], "hello", ""),
    /Choose a target language/,
  );
  assert.throws(() => createToolFromTemplate("missing", "custom-3"));
});
