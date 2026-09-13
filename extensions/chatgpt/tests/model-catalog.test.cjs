const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createModelCatalog,
  migrateCatalog,
  mapCommandToModel,
  CATALOG_STORAGE_KEY,
} = require("../src/utils/model-catalog.ts");
const { DEFAULT_MODEL, DEFAULT_COMMANDS } = require("../src/utils/model-defaults.ts");
const { initialModelId, selectedChatModel } = require("../src/utils/model-selection.ts");
const { validateTemperature } = require("../src/utils/model-validation.ts");
const timestamp = "2026-09-10T12:00:00.000Z";
const base = {
  ...DEFAULT_MODEL,
  id: "writer",
  name: "Writer",
  option: "custom-chat",
  prompt: "Explain clearly",
  temperature: "0.2",
  vision: true,
  enableReasoningEffortChange: true,
  reasoningEffort: "high",
  created_at: timestamp,
  updated_at: timestamp,
};
const command = {
  id: "rewrite",
  name: "Rewrite",
  model: base.option,
  temperature: base.temperature,
  prompt: "Only output corrected text",
  baseModelId: base.id,
  overridePrompt: false,
  contentSource: "clipboard",
  isDisplayInput: true,
};
function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: async (key) => values.get(key),
    setItem: async (key, value) => {
      values.set(key, value);
    },
  };
}
const factory = (io) => createModelCatalog(io, () => new Date(timestamp));
async function configured(io = storage()) {
  const store = factory(io);
  await store.load();
  await store.saveModel(base);
  await store.saveCommand(command);
  return store;
}

test("legacy array models and commands migrate without changing their effective configuration or original storage", async () => {
  const legacy = {
    ...command,
    baseModelId: undefined,
    overridePrompt: undefined,
    model: "deepseek-chat",
    temperature: "0.8",
  };
  const original = {
    models: JSON.stringify([
      { ...base, id: "default" },
      { ...base, id: "command-rewrite", option: "stale-derived-model" },
    ]),
    commands: JSON.stringify({ rewrite: legacy }),
  };
  const io = storage(original);
  const store = factory(io);
  await store.load();
  const snapshot = store.getSnapshot();
  assert.equal(snapshot.models.default.option, base.option);
  const migrated = snapshot.models["command-rewrite"];
  assert.equal(migrated.option, "deepseek-chat");
  assert.equal(migrated.temperature, "0.8");
  assert.equal(migrated.prompt, legacy.prompt);
  assert.equal(migrated.vision, false);
  assert.equal(migrated.enableReasoningEffortChange, false);
  assert.equal(snapshot.catalog.commands.rewrite.configurationMode, "independent");
  assert.equal(snapshot.catalog.commands.rewrite.baseModelId, undefined);
  assert.deepEqual(Object.keys(snapshot.catalog.models), ["default"]);
  assert.equal(io.values.get("models"), original.models);
  assert.equal(io.values.get("commands"), original.commands);
  const restarted = factory(io);
  await restarted.load();
  assert.deepEqual(restarted.getSnapshot().catalog, snapshot.catalog);
});

test("old built-ins and user commands migrate independently without adding or leaving behind presets", async () => {
  const oldCommands = Object.fromEntries(
    Object.entries(DEFAULT_COMMANDS).map(([id, cmd]) => [id, { ...cmd, configurationMode: undefined }]),
  );
  const firstId = Object.keys(oldCommands)[0];
  oldCommands[firstId] = { ...oldCommands[firstId], model: "custom-builtin", temperature: "0", prompt: "" };
  oldCommands.translate = {
    id: "translate",
    name: "Translate",
    model: "translation-model",
    temperature: "0.5",
    prompt: "Translate to English",
    contentSource: "clipboard",
    isDisplayInput: false,
  };
  const io = storage({ models: JSON.stringify({ writer: base }), commands: JSON.stringify(oldCommands) });
  const store = factory(io);
  await store.load();
  const originalModels = store.getSnapshot().catalog.models;
  assert.deepEqual(Object.keys(originalModels).sort(), ["default", "writer"]);
  for (const original of Object.values(oldCommands)) {
    const saved = store.getSnapshot().catalog.commands[original.id];
    const effective = store.getSnapshot().models[`command-${original.id}`];
    assert.equal(saved.configurationMode, "independent");
    assert.equal(saved.baseModelId, undefined);
    assert.equal(effective.option, original.model);
    assert.equal(effective.temperature, original.temperature);
    assert.equal(effective.prompt, original.prompt);
    assert.equal(saved.contentSource, original.contentSource);
    assert.equal(saved.isDisplayInput, original.isDisplayInput);
  }
  await store.saveCommand(DEFAULT_COMMANDS[firstId]);
  await store.removeCommand(oldCommands.translate);
  await store.setCommands(DEFAULT_COMMANDS);
  assert.deepEqual(store.getSnapshot().catalog.models, originalModels);
  const restarted = factory(io);
  await restarted.load();
  assert.deepEqual(restarted.getSnapshot().catalog.models, originalModels);
});

test("a new command inherits all chat settings, including subsequent base model edits", async () => {
  const store = await configured();
  const notifications = [];
  store.subscribe(() => notifications.push(store.getSnapshot().models["command-rewrite"]));
  const updated = {
    ...base,
    option: "next-model",
    prompt: "New base prompt",
    temperature: "1.1",
    reasoningEffort: "low",
  };
  await store.saveModel(updated);
  const model = store.getSnapshot().models["command-rewrite"];
  assert.deepEqual(
    {
      option: model.option,
      prompt: model.prompt,
      temperature: model.temperature,
      effort: model.reasoningEffort,
      reasoning: model.enableReasoningEffortChange,
      vision: model.vision,
    },
    {
      option: "next-model",
      prompt: "New base prompt",
      temperature: "1.1",
      effort: "low",
      reasoning: true,
      vision: true,
    },
  );
  assert.equal(notifications.at(-1).prompt, "New base prompt");
});

test("fresh installs and resetting built-in commands never create additional chat presets", async () => {
  const store = factory(storage());
  await store.load();
  assert.deepEqual(Object.keys(store.getSnapshot().catalog.models), ["default"]);
  const builtin = Object.values(DEFAULT_COMMANDS)[0];
  await store.saveModel(base);
  await store.saveCommand({ ...builtin, configurationMode: "inherit", baseModelId: base.id });
  await store.saveCommand(builtin);
  await store.saveCommand(builtin);
  assert.equal(store.getSnapshot().models[`command-${builtin.id}`].option, builtin.model);
  await store.saveCommand({ ...command, configurationMode: "independent" });
  await store.setCommands(DEFAULT_COMMANDS);
  assert.deepEqual(Object.keys(store.getSnapshot().catalog.models).sort(), ["default", "writer"]);
  assert.deepEqual(Object.keys(store.getSnapshot().catalog.commands).sort(), Object.keys(DEFAULT_COMMANDS).sort());
  for (const cmd of Object.values(store.getSnapshot().catalog.commands)) {
    assert.equal(cmd.configurationMode, "independent");
    assert.equal(cmd.baseModelId, undefined);
  }
});

test("prompt override replaces the base prompt, permits an empty prompt, and can return to inheritance", async () => {
  const store = await configured();
  await store.saveCommand({ ...command, overridePrompt: true });
  await store.saveModel({ ...base, prompt: "Changed parent prompt" });
  assert.equal(store.getSnapshot().models["command-rewrite"].prompt, command.prompt);
  await store.saveCommand({ ...command, overridePrompt: true, prompt: "" });
  assert.equal(store.getSnapshot().models["command-rewrite"].prompt, "");
  await store.saveCommand({ ...command, overridePrompt: false });
  assert.equal(store.getSnapshot().models["command-rewrite"].prompt, "Changed parent prompt");
});

test("changing a command base immediately changes its effective model and preserves its source options", async () => {
  const store = await configured();
  await store.saveModel({ ...base, id: "translator", option: "translation-model", prompt: "Translate only" });
  await store.saveCommand({ ...command, baseModelId: "translator" });
  assert.equal(store.getSnapshot().models["command-rewrite"].option, "translation-model");
  assert.equal(store.getSnapshot().models["command-rewrite"].prompt, "Translate only");
  assert.equal(store.getSnapshot().catalog.commands.rewrite.contentSource, "clipboard");
  assert.equal(store.getSnapshot().catalog.commands.rewrite.isDisplayInput, true);
});

test("deleting or clearing models cannot remove referenced bases; reassignment allows deletion", async () => {
  const io = storage();
  const store = await configured(io);
  const saved = io.values.get(CATALOG_STORAGE_KEY);
  await assert.rejects(store.removeModel(base), /Rewrite/);
  await assert.rejects(store.setModels({ default: DEFAULT_MODEL }), /Choose another base model/);
  assert.equal(io.values.get(CATALOG_STORAGE_KEY), saved);
  await store.saveCommand({ ...command, baseModelId: "default" });
  await store.removeModel(base);
  assert.equal(store.getSnapshot().catalog.models.writer, undefined);
  assert.equal(store.getSnapshot().models["command-rewrite"].option, DEFAULT_MODEL.option);
});

test("older imports preserve missing referenced bases, replace other models and ignore command projections", async () => {
  const io = storage();
  const store = await configured(io);
  await store.saveModel({ ...base, id: "unused" });
  const previous = store.getSnapshot().models["command-rewrite"];
  const baseId = store.getSnapshot().catalog.commands.rewrite.baseModelId;
  await store.importModels([
    { ...DEFAULT_MODEL, option: "imported-default" },
    { ...base, id: "imported", option: "imported-model" },
    { ...base, id: "command-rewrite", option: "obsolete-projection" },
  ]);
  const reloaded = factory(io);
  await reloaded.load();
  assert.deepEqual(reloaded.getSnapshot().models["command-rewrite"], previous);
  assert.equal(reloaded.getSnapshot().catalog.models.unused, undefined);
  assert.equal(reloaded.getSnapshot().catalog.models["command-rewrite"], undefined);
  assert.equal(reloaded.getSnapshot().catalog.models.imported.option, "imported-model");
  assert.equal(reloaded.getSnapshot().catalog.models.default.option, "imported-default");
  await reloaded.importModels({ [baseId]: { ...base, id: baseId, option: "updated-base" } });
  assert.equal(reloaded.getSnapshot().models["command-rewrite"].option, "updated-base");
  await reloaded.saveModel({ ...base, id: "default", option: "customized-default" });
  await reloaded.saveCommand({ ...command, baseModelId: "default" });
  await reloaded.importModels({ imported: { ...base, id: "imported" } });
  assert.equal(reloaded.getSnapshot().models["command-rewrite"].option, "customized-default");
});

test("failed persistence leaves the previous state intact and a retry succeeds", async () => {
  const io = storage();
  const store = await configured(io);
  const original = io.setItem;
  io.setItem = async () => {
    throw new Error("Disk full");
  };
  await assert.rejects(store.saveCommand({ ...command, name: "Changed" }), /Disk full/);
  assert.equal(store.getSnapshot().catalog.commands.rewrite.name, "Rewrite");
  io.setItem = original;
  await store.saveCommand({ ...command, name: "Changed" });
  assert.equal(store.getSnapshot().models["command-rewrite"].name, "Changed");
});

test("queued saves merge rather than overwriting one another, and deleting a command removes its projection", async () => {
  const io = storage();
  const store = await configured(io);
  await Promise.all([
    store.saveModel({ ...base, prompt: "Updated" }),
    store.saveCommand({ ...command, name: "Renamed" }),
  ]);
  const restarted = factory(io);
  await restarted.load();
  assert.equal(restarted.getSnapshot().models["command-rewrite"].name, "Renamed");
  assert.equal(restarted.getSnapshot().models["command-rewrite"].prompt, "Updated");
  await restarted.removeCommand(command);
  assert.equal(restarted.getSnapshot().models["command-rewrite"], undefined);
  assert.equal(restarted.getSnapshot().catalog.models.writer.prompt, "Updated");
});

test("corrupt legacy data or an invalid command reference is reported without replacing stored data", async () => {
  const io = storage({ models: "{bad json", commands: "{}" });
  const store = factory(io);
  await assert.rejects(store.load(), SyntaxError);
  assert.equal(io.values.has(CATALOG_STORAGE_KEY), false);
  assert.equal(store.getSnapshot().isLoading, false);
  assert.ok(store.getSnapshot().error);
  io.values.set("models", "{}");
  await store.load();
  await assert.rejects(store.saveCommand(command), /existing base model/);
  assert.equal(store.getSnapshot().catalog.commands.rewrite, undefined);
});

test("legacy migration preserves existing presets even when their IDs resemble generated bases", () => {
  const legacy = { ...command, baseModelId: undefined };
  const catalog = migrateCatalog({ "base:rewrite": { ...base, id: "base:rewrite" } }, { rewrite: legacy }, timestamp);
  assert.equal(catalog.models["base:rewrite"].vision, true);
  assert.equal(catalog.commands.rewrite.baseModelId, undefined);
  assert.equal(mapCommandToModel(catalog.commands.rewrite, catalog.models).vision, false);
});

test("explicit model and saved conversation selection win over the cached model; invalid cache falls back", () => {
  assert.equal(initialModelId(base, "default"), base.id);
  assert.equal(initialModelId(undefined, base.id), base.id);
  const data = { default: DEFAULT_MODEL, writer: { ...base, prompt: "Latest config" } };
  assert.equal(selectedChatModel(data, base.id, base).prompt, "Latest config");
  assert.equal(selectedChatModel(data, "removed").id, "default");
  const historical = { ...base, id: "removed", prompt: "Historical preset" };
  assert.equal(selectedChatModel(data, "removed", historical).prompt, "Historical preset");
});

test("loading and resetting a previously linked built-in preserves shared bases and restores independent defaults", async () => {
  const defaultCommand = Object.values(DEFAULT_COMMANDS)[0];
  const savedBase = { ...base, option: "custom-default-model" };
  const store = factory(
    storage({
      [CATALOG_STORAGE_KEY]: JSON.stringify({
        version: 1,
        models: { default: DEFAULT_MODEL, writer: savedBase },
        commands: {
          [defaultCommand.id]: { ...defaultCommand, configurationMode: undefined, baseModelId: base.id },
          rewrite: command,
        },
      }),
    }),
  );
  await store.load();
  assert.equal(store.getSnapshot().models[`command-${defaultCommand.id}`].option, savedBase.option);
  await store.saveCommand(defaultCommand);
  assert.equal(store.getSnapshot().models["command-rewrite"].option, "custom-default-model");
  assert.equal(store.getSnapshot().models[`command-${defaultCommand.id}`].option, defaultCommand.model);
  const size = Object.keys(store.getSnapshot().catalog.models).length;
  await store.saveCommand(defaultCommand);
  assert.equal(Object.keys(store.getSnapshot().catalog.models).length, size);
  assert.equal(store.getSnapshot().catalog.commands[defaultCommand.id].configurationMode, "independent");
  assert.equal(store.getSnapshot().catalog.commands[defaultCommand.id].baseModelId, undefined);
});

test("independent commands own every setting without creating or depending on a base model", async () => {
  const io = storage();
  const store = await configured(io);
  const modelIds = Object.keys(store.getSnapshot().catalog.models);
  await store.saveCommand({
    ...command,
    configurationMode: "independent",
    model: "standalone-model",
    temperature: "0",
    prompt: "",
    enableReasoningEffortChange: true,
    reasoningEffort: "low",
    vision: true,
  });
  assert.deepEqual(Object.keys(store.getSnapshot().catalog.models), modelIds);
  assert.equal(store.getSnapshot().catalog.commands.rewrite.baseModelId, undefined);
  await store.saveModel({ ...base, option: "changed-parent", vision: false });
  await store.removeModel(base);
  await store.setModels(store.getSnapshot().catalog.models);
  const restarted = factory(io);
  await restarted.load();
  const result = restarted.resolveModel(restarted.getSnapshot().catalog.commands.rewrite);
  assert.equal(result.option, "standalone-model");
  assert.equal(result.temperature, "0");
  assert.equal(result.prompt, "");
  assert.equal(result.enableReasoningEffortChange, true);
  assert.equal(result.reasoningEffort, "low");
  assert.equal(result.vision, true);
  assert.equal(result.created_at, timestamp);
  assert.equal(result.updated_at, timestamp);
  const laterTimestamp = "2026-09-11T12:00:00.000Z";
  const later = createModelCatalog(io, () => new Date(laterTimestamp));
  await later.load();
  assert.equal(later.getSnapshot().models["command-rewrite"].created_at, timestamp);
  const stored = later.getSnapshot().catalog.commands.rewrite;
  await later.saveCommand({
    ...stored,
    name: "Edited independent command",
    created_at: undefined,
    updated_at: undefined,
  });
  assert.equal(later.getSnapshot().models["command-rewrite"].created_at, timestamp);
  assert.equal(later.getSnapshot().models["command-rewrite"].updated_at, laterTimestamp);
  await later.saveCommand({ ...command, configurationMode: "inherit", baseModelId: "default" });
  assert.equal(later.getSnapshot().models["command-rewrite"].created_at, timestamp);
  await later.saveCommand({ ...command, configurationMode: "independent" });
  assert.equal(later.getSnapshot().models["command-rewrite"].created_at, timestamp);
});

test("each override wins independently, including false values, and clearing it resumes inheritance", async () => {
  const store = await configured();
  const overridden = {
    ...command,
    configurationMode: "inherit",
    overrideModel: true,
    model: "own-model",
    overrideTemperature: true,
    temperature: "0",
    overrideReasoning: true,
    enableReasoningEffortChange: false,
    reasoningEffort: "none",
    overrideVision: true,
    vision: false,
    overridePrompt: true,
    prompt: "",
  };
  await store.saveCommand(overridden);
  assert.deepEqual(store.getSnapshot().catalog.models.writer, base);
  const nextBase = { ...base, option: "new-base", temperature: "1.5", prompt: "New prompt", reasoningEffort: "low" };
  await store.saveModel(nextBase);
  const cases = [
    ["overrideModel", "option", "own-model", "new-base"],
    ["overrideTemperature", "temperature", "0", "1.5"],
    ["overrideReasoning", "enableReasoningEffortChange", false, true],
    ["overrideReasoning", "reasoningEffort", "none", "low"],
    ["overrideVision", "vision", false, true],
    ["overridePrompt", "prompt", "", "New prompt"],
  ];
  for (const [flag, field, ownValue, inheritedValue] of cases) {
    await store.saveCommand(overridden);
    assert.equal(store.getSnapshot().models["command-rewrite"][field], ownValue, `${field} is overridden`);
    await store.saveCommand({ ...overridden, [flag]: false });
    const result = store.getSnapshot().models["command-rewrite"];
    assert.equal(result[field], inheritedValue, `${field} resumes inheritance`);
    for (const [otherFlag, otherField, otherValue] of cases) {
      if (otherFlag !== flag) assert.equal(result[otherField], otherValue, `${field} does not reset ${otherField}`);
    }
  }
});

test("explicit inheritance requires a valid base and never creates a legacy migration preset", async () => {
  const io = storage();
  const store = await configured(io);
  const before = io.values.get(CATALOG_STORAGE_KEY);
  await assert.rejects(
    store.saveCommand({ ...command, configurationMode: "inherit", baseModelId: undefined }),
    /existing base model/,
  );
  await assert.rejects(
    store.saveCommand({ ...command, configurationMode: "inherit", baseModelId: "missing" }),
    /existing base model/,
  );
  assert.equal(io.values.get(CATALOG_STORAGE_KEY), before);
});

test("temperature accepts both endpoints and rejects empty, nonfinite and out-of-range input", () => {
  for (const value of ["0", "2", " 0.25 "]) assert.equal(validateTemperature(value), undefined);
  for (const value of [undefined, "", " ", "NaN", "Infinity", "abc", "-0.1", "2.1"]) {
    assert.equal(validateTemperature(value), "Enter a number between 0 and 2", String(value));
  }
});
