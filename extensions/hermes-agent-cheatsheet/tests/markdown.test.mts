import assert from "node:assert/strict";
import test from "node:test";
import { createItemMarkdown, createItemPreviewMarkdown } from "../src/lib/markdown.ts";
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
  platforms: ["Terminal"],
  statuses: ["PERSISTS"],
  documentationUrl: "https://hermes-agent.nousresearch.com/docs/reference/cli-commands",
  details: {
    whenToUse: "Choose a model before starting model-specific work.",
    prerequisites: ["Configure the provider first."],
    parameters: [{ name: "--provider <name>", description: "Select the configured provider." }],
    workflow: [{ title: "Validate", command: "hermes doctor", description: "Check the provider setup." }],
    notes: ["Global changes affect future sessions."],
  },
};

test("renders the complete command reference", () => {
  const markdown = createItemMarkdown(item);

  assert.match(markdown, /## What it does\nChoose a provider and model\./);
  assert.match(markdown, /## When to use\nChoose a model before starting model-specific work\./);
  assert.match(markdown, /## Before you run it\n- Configure the provider first\./);
  assert.match(markdown, /## Arguments and options\n- `--provider <name>`/);
  assert.match(markdown, /## Recommended workflow[\s\S]*```bash\nhermes doctor\n```/);
  assert.match(markdown, /## Behavior and scope[\s\S]*\*\*PERSISTS\*\*/);
  assert.match(markdown, /## Available in\n- Terminal/);
  assert.match(markdown, /## Official documentation/);
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

test("keeps the list preview concise", () => {
  const markdown = createItemPreviewMarkdown(item, {
    effectiveCommand: "/model gpt-5.6-sol --provider openai-codex --global",
  });

  assert.match(markdown, /```bash\n\/model gpt-5\.6-sol --provider openai-codex --global\n```/);
  assert.doesNotMatch(markdown, /When to use|Arguments and options|Recommended workflow|Official documentation/);
});

test("renders related commands only in the complete detail", () => {
  const markdown = createItemMarkdown(item, {
    relatedItems: [{ ...item, id: "models-auth", name: "hermes auth", usage: "hermes auth" }],
  });

  assert.match(markdown, /## Related commands[\s\S]*`hermes auth`/);
});
