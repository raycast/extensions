import assert from "node:assert/strict";
import test from "node:test";
import { createItemMarkdown } from "../src/lib/markdown.ts";
import type { CheatsheetItem } from "../src/types.ts";

const item: CheatsheetItem = {
  id: "models-hermes-model",
  name: "hermes model",
  description: "Choose a provider and model.",
  usage: "hermes model",
  examples: [
    {
      title: "Persist OpenAI Codex",
      command: "/model gpt-5.6-sol --provider openai-codex --global",
      description: "Save the selection as the global default.",
    },
  ],
  category: "models",
  tags: ["provider"],
  documentationUrl: "https://hermes-agent.nousresearch.com/docs/reference/cli-commands",
};

test("renders usage before the item description", () => {
  const markdown = createItemMarkdown(item);

  assert.ok(markdown.indexOf("```bash\nhermes model\n```") < markdown.indexOf("Choose a provider and model."));
});

test("renders each example command before its description", () => {
  const markdown = createItemMarkdown(item);

  assert.ok(
    markdown.indexOf("```bash\n/model gpt-5.6-sol --provider openai-codex --global\n```") <
      markdown.indexOf("Save the selection as the global default."),
  );
});

test("escapes command placeholders in prose without changing code blocks", () => {
  const markdown = createItemMarkdown({
    ...item,
    name: "/diff <path>",
    usage: "/diff <path>",
    description: "Compare against /rollback diff <N>.",
  });

  assert.match(markdown, /^# \/diff &lt;path&gt;/);
  assert.match(markdown, /```bash\n\/diff <path>\n```/);
  assert.match(markdown, /rollback diff &lt;N&gt;/);
});
