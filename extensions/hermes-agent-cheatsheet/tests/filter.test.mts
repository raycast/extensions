import assert from "node:assert/strict";
import test from "node:test";
import {
  getContextualExample,
  getExamples,
  getModelPersonalizationState,
  getPrimaryExample,
  getPrimarySelection,
} from "../src/lib/examples.ts";
import { getEffectiveStatuses } from "../src/lib/status.ts";
import { getRelatedItems } from "../src/lib/related.ts";
import { filterItems } from "../src/lib/filter.ts";
import type { CheatsheetItem } from "../src/types.ts";

const fixture: CheatsheetItem[] = [
  {
    id: "models-hermes-model",
    name: "hermes model",
    description: "Choose a provider and model.",
    usage: "hermes model",
    examples: [
      {
        title: "Persist OpenAI Codex",
        command: "/model gpt-5.6-sol --provider openai-codex --global",
      },
    ],
    category: "models",
    tags: ["oauth", "provider"],
    documentationUrl: "https://hermes-agent.nousresearch.com/docs/reference/cli-commands",
  },
  {
    id: "automation-hermes-cron-list",
    name: "hermes cron list",
    description: "List scheduled jobs.",
    usage: "hermes cron list",
    category: "automation",
    tags: ["scheduled", "jobs"],
    documentationUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/features/cron",
    details: {
      whenToUse: "Inspect recurring automation.",
      parameters: [{ name: "--delivery", description: "Choose where results are sent." }],
      workflow: [{ title: "Inspect status", command: "hermes cron status" }],
      notes: ["Paused jobs remain configured."],
    },
  },
  {
    id: "slash-statusbar",
    name: "/statusbar",
    description: "Toggle the context/model status bar.",
    usage: "/statusbar",
    category: "slash",
    tags: ["status"],
    documentationUrl: "https://hermes-agent.nousresearch.com/docs/reference/slash-commands",
  },
];

test("filters by category", () => {
  assert.deepEqual(
    filterItems(fixture, "models", "").map((item) => item.id),
    ["models-hermes-model"],
  );
});

test("searches command names, descriptions, usage, and tags", () => {
  assert.equal(filterItems(fixture, "all", "provider").length, 1);
  assert.equal(filterItems(fixture, "all", "scheduled").length, 1);
  assert.equal(filterItems(fixture, "all", "cron list").length, 1);
  assert.equal(filterItems(fixture, "all", "gpt-5.6-sol").length, 1);
  assert.equal(filterItems(fixture, "all", "persist openai").length, 1);
  assert.equal(filterItems(fixture, "all", "recurring automation").length, 1);
  assert.equal(filterItems(fixture, "all", "--delivery").length, 1);
  assert.equal(filterItems(fixture, "all", "paused jobs").length, 1);
});

test("search is case-insensitive", () => {
  assert.equal(filterItems(fixture, "all", "OAUTH").length, 1);
});

test("slash-command searches ignore incidental description matches", () => {
  assert.deepEqual(
    filterItems(fixture, "all", "/model").map((item) => item.id),
    ["models-hermes-model"],
  );
});

test("slash-command searches match non-contiguous command tokens", () => {
  assert.deepEqual(
    filterItems(fixture, "all", "/model --global").map((item) => item.id),
    ["models-hermes-model"],
  );
  assert.equal(getPrimaryExample(fixture[0], "/model --global")?.title, "Persist OpenAI Codex");
  assert.equal(filterItems(fixture, "all", "/model --global --once").length, 0);
});

test("selects the example that best matches the active search", () => {
  const item = {
    ...fixture[0],
    examples: [
      { title: "Session", command: "/model gpt-5.6-sol --provider openai-codex --session" },
      { title: "Global", command: "/model gpt-5.6-sol --provider openai-codex --global" },
      { title: "Refresh", command: "/model --refresh" },
    ],
  };

  assert.equal(getPrimaryExample(item, "--global")?.title, "Global");
  assert.equal(getPrimaryExample(item, "refresh")?.title, "Refresh");
  assert.equal(getPrimaryExample(item, "")?.title, "Session");
});

test("personalizes model-switch examples using preferences", () => {
  const item = { ...fixture[0], id: "command-model" };
  const example = getPrimaryExample(item, "global", {
    preferredModel: "my-model",
    preferredProvider: "my-provider",
  });

  assert.equal(example?.command, "/model my-model --provider my-provider --global");
});

test("searches effective personalized commands instead of replaced examples", () => {
  const preferences = {
    preferredModel: "my-model",
    preferredProvider: "my-provider",
  };
  const personalizedFixture = fixture.map((item) => ({ ...item, examples: getExamples(item, preferences) }));

  assert.equal(filterItems(personalizedFixture, "all", "/model my-model my-provider").length, 1);
  assert.equal(filterItems(personalizedFixture, "all", "/model gpt-5.6-sol openai-codex").length, 0);
});

test("does not assume a model or provider when preferences are empty", () => {
  const item = { ...fixture[0], id: "command-model" };
  const example = getPrimaryExample(item, "global", {
    preferredModel: "",
    preferredProvider: "",
  });

  assert.equal(example?.command, "/model gpt-5.6-sol --provider openai-codex --global");
});

test("requires both model and provider before personalizing examples", () => {
  const item = { ...fixture[0], id: "command-model" };

  assert.equal(
    getPrimaryExample(item, "global", {
      preferredModel: "",
      preferredProvider: "anthropic",
    })?.command,
    "/model gpt-5.6-sol --provider openai-codex --global",
  );
  assert.equal(
    getPrimaryExample(item, "global", {
      preferredModel: "my-model",
      preferredProvider: "",
    })?.command,
    "/model gpt-5.6-sol --provider openai-codex --global",
  );
});

test("flags incomplete model personalization when either preference is missing", () => {
  const examples = getExamples(fixture[0]);

  assert.deepEqual(getModelPersonalizationState(examples, { preferredModel: "", preferredProvider: "" }), {
    needsPreferences: true,
    missingModel: true,
    missingProvider: true,
  });
  assert.deepEqual(getModelPersonalizationState(examples, { preferredModel: "my-model", preferredProvider: "" }), {
    needsPreferences: true,
    missingModel: false,
    missingProvider: true,
  });
  assert.deepEqual(getModelPersonalizationState(examples, { preferredModel: "", preferredProvider: "anthropic" }), {
    needsPreferences: true,
    missingModel: true,
    missingProvider: false,
  });
  assert.equal(
    getModelPersonalizationState(examples, { preferredModel: "my-model", preferredProvider: "anthropic" })
      .needsPreferences,
    false,
  );
});

test("does not request personalization for items without a switchable model example", () => {
  const item: CheatsheetItem = {
    ...fixture[0],
    id: "models-refresh-only",
    examples: [{ title: "Refresh", command: "/model --refresh" }],
  };

  assert.equal(
    getModelPersonalizationState(getExamples(item), { preferredModel: "", preferredProvider: "" }).needsPreferences,
    false,
  );
});

test("personalizes and deduplicates model-switch examples across catalog entries", () => {
  const item: CheatsheetItem = {
    ...fixture[0],
    id: "models-model-model-name-provider-provider-global",
    examples: [
      { title: "OpenAI", command: "/model gpt-5.6-sol --provider openai-codex --global" },
      { title: "Anthropic", command: "/model claude-sonnet-4-6 --provider anthropic --global" },
    ],
  };
  const examples = getExamples(item, {
    preferredModel: "my-model",
    preferredProvider: "my-provider",
  });

  assert.deepEqual(
    examples.map((example) => example.command),
    ["/model my-model --provider my-provider --global"],
  );
  assert.equal(examples[0]?.title, "Your Model — Global");
});

test("preserves the search-selected recipe in contextual detail actions", () => {
  const item = { ...fixture[0], id: "command-model" };
  item.examples = [
    { title: "Session", command: "/model gpt-5.6-sol --provider openai-codex --session" },
    { title: "Global", command: "/model gpt-5.6-sol --provider openai-codex --global" },
  ];

  assert.equal(
    getContextualExample(
      item,
      "/model gpt-5.6-sol --provider openai-codex --global",
      "",
      { preferredModel: "", preferredProvider: "" },
    )?.title,
    "Global",
  );
});

test("uses the same effective command for generic primary content and consequence badges", () => {
  const item = { ...fixture[0], id: "command-model" };
  item.examples = [
    { title: "Switch", command: "/model gpt-5.6-sol --provider openai-codex" },
    { title: "Refresh", command: "/model --refresh" },
  ];

  const selection = getPrimarySelection(item, "--refresh", {
    preferredModel: "",
    preferredProvider: "",
    primaryContent: "usage",
  });

  assert.equal(selection.example?.title, "Refresh");
  assert.equal(selection.kind, "usage");
  assert.equal(selection.content, item.usage);
});

test("updates model consequence badges for the selected recipe", () => {
  const item: CheatsheetItem = {
    ...fixture[0],
    id: "command-model",
    statuses: ["SESSION", "CAUTION"],
  };

  assert.deepEqual(getEffectiveStatuses(item, "/model gpt-5.6-sol --session"), ["CAUTION", "SESSION"]);
  assert.deepEqual(getEffectiveStatuses(item, "/model gpt-5.6-sol --global"), ["CAUTION", "PERSISTS"]);
  assert.deepEqual(getEffectiveStatuses(item, "/model gpt-5.6-sol --once"), ["CAUTION"]);
  assert.deepEqual(getEffectiveStatuses(item, "/model gpt-5.6-sol"), ["CAUTION"]);
  assert.deepEqual(getEffectiveStatuses(item, "/model --refresh"), []);
});

test("updates fast-mode scope badges for session and global variants", () => {
  const item: CheatsheetItem = {
    ...fixture[0],
    id: "command-fast",
    usage: "/fast [normal|fast|status] [--global]",
    statuses: ["PERSISTS"],
  };

  assert.deepEqual(getEffectiveStatuses(item, "/fast fast"), ["SESSION"]);
  assert.deepEqual(getEffectiveStatuses(item, "/fast normal"), ["SESSION"]);
  assert.deepEqual(getEffectiveStatuses(item, "/fast fast --global"), ["PERSISTS"]);
  assert.deepEqual(getEffectiveStatuses(item, "/fast status"), []);
  assert.deepEqual(getEffectiveStatuses(item, item.usage), []);
});

test("related commands require focused evidence beyond category", () => {
  const target: CheatsheetItem = {
    ...fixture[0],
    id: "slash-model",
    category: "slash",
    tags: ["slash command", "model", "provider"],
  };
  const relevant: CheatsheetItem = {
    ...fixture[0],
    id: "models-auth",
    name: "hermes auth status",
    usage: "hermes auth status",
    tags: ["auth", "provider"],
  };
  const irrelevant: CheatsheetItem = {
    ...fixture[2],
    id: "slash-agents",
    name: "/agents",
    usage: "/agents",
    description: "List delegated agents.",
    tags: ["slash command", "delegation"],
  };

  assert.deepEqual(
    getRelatedItems(target, [target, relevant, irrelevant]).map((item) => item.id),
    ["models-auth"],
  );
});
