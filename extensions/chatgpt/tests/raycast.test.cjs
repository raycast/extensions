const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { launch, available } = require("./raycast-harness.cjs");
const { DEFAULT_MODEL } = require("../src/utils/model-defaults.ts");
const { createModelCatalog, CATALOG_STORAGE_KEY } = require("../src/utils/model-catalog.ts");
const native = {
  skip: available
    ? false
    : "Raycast desktop JavaScript runtime is not installed; set RAYCAST_API_ROOT to run native integration checks",
  timeout: 20000,
};
const writer = {
  ...DEFAULT_MODEL,
  id: "writer",
  name: "Writer",
  option: "writer-v1",
  prompt: "Writer instructions",
  temperature: "0.2",
  enableReasoningEffortChange: true,
  reasoningEffort: "high",
};
const editor = { ...writer, id: "editor", name: "Editor", option: "editor-v1", prompt: "Editor instructions" };
const fixture = { models: JSON.stringify({ writer }), commands: "{}" };
const inheritedCommand = {
  id: "rewrite",
  name: "Rewrite",
  configurationMode: "inherit",
  baseModelId: "writer",
  overrideModel: true,
  model: "command-only-model",
  overridePrompt: true,
  prompt: "Command-only instructions",
  temperature: "0.9",
  contentSource: "selectedText",
  isDisplayInput: true,
};
const commandFixture = { ...fixture, commands: JSON.stringify({ rewrite: inheritedCommand }) };
const body = (tree) => tree.navigationStack.body;
const actions = (tree) => tree.actions?.sections.flatMap((s) => s.items) || [];
const field = (tree, id) => body(tree).items?.find((item) => item.id === id);
const value = (tree, id) => field(tree, id)?.value?.value;
const menuItems = (dropdown) => dropdown.menu.sections.flatMap((section) => section.items);
const page = (title) => (tree) => body(tree).navigationTitle === title && !body(tree).isLoading;
let eventCount = 0;
async function action(app, title, data) {
  const target = await app.waitFor((tree) => actions(tree).find((item) => item.title === title), title);
  await app.callback(target.onAction, data);
}
async function select(app, id) {
  await app.callback(body(app.tree).onSelectionChange, { value: id, eventCount: ++eventCount });
  await app.waitFor((tree) => body(tree).selectedItemId?.value === id, `selected ${id}`);
}
async function change(app, id, next) {
  const target = field(app.tree, id);
  assert.ok(target, `field ${id} exists`);
  await app.callback(target.onChange, { value: next, eventCount: ++eventCount });
  await app.waitFor((tree) => value(tree, id) === next, `field ${id}=${next}`);
}
async function chooseCustomModel(app, id, searchText) {
  const target = field(app.tree, id);
  assert.equal(target.kind, "Dropdown");
  assert.equal(target.filteringEnabled, true);
  await app.callback(target.onSearchTextChange, { value: searchText, eventCount: ++eventCount });
  const modelId = searchText.trim();
  await app.waitFor(
    (tree) =>
      field(tree, id)
        .menu.sections.flatMap((section) => section.items)
        .some((item) => item.id === modelId && item.title === `Use "${modelId}"`),
    `manual model choice ${modelId}`,
  );
  await change(app, id, modelId);
}
async function submit(app, title) {
  const fields = body(app.tree).items.filter((item) => item.value !== undefined);
  await action(app, title, Object.fromEntries(fields.map((item) => [item.id, { value: item.value.value }])));
}
async function back(app) {
  await app.callback(app.tree.navigationStack.onPop);
}
function cacheDirectory(t) {
  const fs = require("node:fs");
  const path = require("node:path");
  const os = require("node:os");
  const support = fs.mkdtempSync(path.join(os.tmpdir(), "chatgpt-cache-test-"));
  t.after(() => fs.rmSync(support, { recursive: true, force: true }));
  return support;
}
async function rememberWriter(support, initialStorage = fixture, prefs = {}) {
  const app = await launch("model", initialStorage, prefs, { supportDirectory: support });
  try {
    await app.waitFor(page("Models"));
    await select(app, "writer");
    await action(app, "Ask with This Model");
    await app.waitFor(page("Ask"));
    return Object.fromEntries(app.storage);
  } finally {
    await app.close();
  }
}
async function provider(t, modelStatus = 200) {
  const requests = [];
  const modelRequests = [];
  const server = http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/v1/models") {
      modelRequests.push(req.url);
      res.statusCode = modelStatus;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify(
          modelStatus === 200
            ? { data: [{ id: "remote-one" }, { id: "remote-two" }] }
            : { error: { message: "Model discovery is not supported" } },
        ),
      );
      return;
    }
    let text = "";
    for await (const chunk of req) text += chunk;
    requests.push(JSON.parse(text));
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ choices: [{ message: { content: "Fixture answer" } }] }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return {
    requests,
    modelRequests,
    prefs: { useApiEndpoint: true, apiEndpoint: `http://127.0.0.1:${server.address().port}/v1` },
  };
}

async function createDirectCommand(app, name) {
  await app.waitFor((tree) => body(tree).kind === "List" && !body(tree).isLoading);
  await app.callback(body(app.tree).onSearchTextChange, { value: name, eventCount: ++eventCount });
  const item = await app.waitFor((tree) =>
    body(tree)
      .sections.flatMap((section) => section.items)
      .find((item) => item.title === name),
  );
  await select(app, item.id);
  await action(app, "Create AI Command");
  await app.waitFor(page("Create AI Command"));
}

test(
  "AI Commands creates an independent command after model discovery fails, validates it and runs its own settings",
  native,
  async (t) => {
    const api = await provider(t, 404);
    const app = await launch("search-ai-command", {}, api.prefs);
    t.after(app.close);
    await createDirectCommand(app, "Independent rewrite");
    await app.waitFor(() =>
      app.methods.some((method) => method.method === "showToast" && method.params.title === "Could not load models"),
    );
    const previousModels = JSON.parse(app.storage.get(CATALOG_STORAGE_KEY)).models;
    assert.equal(value(app.tree, "configurationMode"), "independent");
    assert.equal(field(app.tree, "baseModelId"), undefined);
    assert.equal(field(app.tree, "overridePrompt"), undefined);
    await change(app, "name", "  ");
    await change(app, "model", "  ");
    await change(app, "temperature", "NaN");
    await submit(app, "Save AI Command");
    await app.waitFor(
      (tree) =>
        field(tree, "name")?.error === "Enter a command name" &&
        field(tree, "model")?.error === "Enter a model name" &&
        field(tree, "temperature")?.error === "Enter a number between 0 and 2",
    );
    assert.ok(
      !Object.values(JSON.parse(app.storage.get(CATALOG_STORAGE_KEY)).commands).some(
        (cmd) => cmd.name === "Independent rewrite",
      ),
    );
    await change(app, "configurationMode", "inherit");
    assert.equal(value(app.tree, "model"), DEFAULT_MODEL.option);
    assert.equal(value(app.tree, "temperature"), DEFAULT_MODEL.temperature);
    assert.equal(field(app.tree, "model").error, undefined);
    assert.equal(field(app.tree, "temperature").error, undefined);
    assert.equal(field(app.tree, "name").error, "Enter a command name", "unrelated validation remains visible");
    await change(app, "configurationMode", "independent");
    await change(app, "name", "Independent rewrite");
    await chooseCustomModel(app, "model", "  solo-v1  ");
    await change(app, "temperature", "0");
    await change(app, "prompt", "");
    await change(app, "enableReasoningEffortChange", true);
    await change(app, "reasoningEffort", "low");
    await change(app, "vision", true);
    await submit(app, "Save AI Command");
    await app.waitFor((tree) => body(tree).kind === "List");
    const catalog = JSON.parse(app.storage.get(CATALOG_STORAGE_KEY));
    const saved = Object.values(catalog.commands).find((cmd) => cmd.name === "Independent rewrite");
    assert.equal(saved.configurationMode, "independent");
    assert.equal(saved.baseModelId, undefined);
    assert.ok(Number.isFinite(Date.parse(saved.created_at)));
    assert.ok(Number.isFinite(Date.parse(saved.updated_at)));
    assert.deepEqual(catalog.models, previousModels);
    await select(app, saved.id);
    await action(app, "Open AI Command");
    await app.waitFor((tree) => body(tree).kind === "Detail" && body(tree).markdown?.includes("Fixture answer"));
    assert.equal(api.requests[0].model, "solo-v1");
    assert.equal(api.requests[0].temperature, 0);
    assert.equal(api.requests[0].reasoning_effort, "low");
    assert.deepEqual(api.requests[0].messages, [{ role: "user", content: "Text to rewrite" }]);
    await action(app, "Continue in Chat");
    await app.waitFor(page("Ask"));
    assert.equal(body(app.tree).searchBarAccessory.value.value, `command-${saved.id}`);
    assert.equal(
      menuItems(body(app.tree).searchBarAccessory).find((item) => item.id === `command-${saved.id}`).title,
      "Command: Independent rewrite",
    );
    await action(app, "Edit AI Command");
    await app.waitFor(page("Edit AI Command"));
    assert.equal(value(app.tree, "configurationMode"), "independent");
    assert.equal(value(app.tree, "model"), "solo-v1");
    assert.equal(value(app.tree, "prompt"), "");
    assert.equal(value(app.tree, "vision"), true);
    assert.equal(value(app.tree, "reasoningEffort"), "low");
  },
);

test("an independent command can select a model fetched from the configured endpoint", native, async (t) => {
  const api = await provider(t);
  const app = await launch("search-ai-command", {}, api.prefs);
  t.after(app.close);
  await createDirectCommand(app, "Remote rewrite");
  await app.waitFor((tree) =>
    field(tree, "model")
      ?.menu.sections.flatMap((section) => section.items)
      .some((item) => item.id === "remote-two"),
  );
  assert.ok(api.modelRequests.length > 0);
  await change(app, "model", "remote-two");
  await submit(app, "Save AI Command");
  await app.waitFor((tree) => body(tree).kind === "List");
  const saved = Object.values(JSON.parse(app.storage.get(CATALOG_STORAGE_KEY)).commands).find(
    (cmd) => cmd.name === "Remote rewrite",
  );
  await select(app, saved.id);
  await action(app, "Open AI Command");
  await app.waitFor((tree) => body(tree).kind === "Detail" && body(tree).markdown?.includes("Fixture answer"));
  assert.equal(api.requests[0].model, "remote-two");
});

test(
  "existing command quicklinks continue with labeled command settings and remember only explicitly chosen bases",
  native,
  async (t) => {
    const api = await provider(t);
    const support = cacheDirectory(t);
    const legacy = {
      id: "existing-quicklink",
      name: "Quicklink command",
      model: "quicklink-model",
      temperature: "0.4",
      prompt: "Preserve my command instructions",
      contentSource: "selectedText",
      isDisplayInput: true,
    };
    const initialStorage = await rememberWriter(
      support,
      { models: JSON.stringify({ writer, editor }), commands: JSON.stringify({ [legacy.id]: legacy }) },
      api.prefs,
    );
    const app = await launch("search-ai-command", initialStorage, api.prefs, {
      supportDirectory: support,
      launchContext: { commandId: legacy.id },
    });
    t.after(app.close);
    await app.waitFor((tree) => body(tree).kind === "Detail" && body(tree).markdown?.includes("Fixture answer"));
    assert.equal(api.requests.length, 1);
    assert.equal(api.requests[0].model, legacy.model);
    assert.equal(api.requests[0].temperature, 0.4);
    assert.deepEqual(api.requests[0].messages, [
      { role: "system", content: legacy.prompt },
      { role: "user", content: "Text to rewrite" },
    ]);
    await action(app, "Continue in Chat");
    await app.waitFor(page("Ask"));
    assert.equal(body(app.tree).searchBarAccessory.value.value, `command-${legacy.id}`);
    await app.callback(body(app.tree).searchBarAccessory.onChange, {
      value: `command-${legacy.id}`,
      eventCount: ++eventCount,
    });
    await app.callback(body(app.tree).onSearchTextChange, { value: "Explain the result", eventCount: ++eventCount });
    await app.waitFor((tree) => body(tree).searchBarText.value === "Explain the result");
    await action(app, "Get Answer");
    await app.waitFor((tree) => !body(tree).isLoading && api.requests.length === 2);
    assert.equal(api.requests[1].model, legacy.model);
    assert.equal(api.requests[1].temperature, 0.4);
    assert.deepEqual(api.requests[1].messages, [
      { role: "system", content: legacy.prompt },
      { role: "user", content: "Text to rewrite" },
      { role: "assistant", content: "Fixture answer" },
      { role: "user", content: "Explain the result" },
    ]);
    await action(app, "Full Text Input");
    await app.waitFor((tree) => field(tree, "question"));
    const sessionId = `command-${legacy.id}`;
    assert.deepEqual(
      menuItems(field(app.tree, "model"))
        .map((item) => item.id)
        .sort(),
      [sessionId, "default", "editor", "writer"].sort(),
    );
    assert.equal(
      menuItems(field(app.tree, "model")).find((item) => item.id === sessionId).title,
      "Command: Quicklink command",
    );
    await change(app, "model", "editor");
    assert.ok(
      menuItems(field(app.tree, "model")).some(
        (item) => item.id === sessionId && item.title === "Command: Quicklink command",
      ),
      "the conversation command remains selectable after choosing a base",
    );
    await change(app, "model", sessionId);
    await change(app, "question", "One more question");
    await submit(app, "Submit");
    await app.waitFor((tree) => page("Ask")(tree) && api.requests.length === 3);
    assert.equal(api.requests[2].model, legacy.model);
    assert.equal(api.requests[2].messages[0].content, legacy.prompt);
    const savedStorage = Object.fromEntries(app.storage);
    await app.close();
    const ordinaryAsk = await launch("ask", savedStorage, api.prefs, { supportDirectory: support });
    t.after(ordinaryAsk.close);
    await ordinaryAsk.waitFor(page("Ask"));
    assert.equal(
      body(ordinaryAsk.tree).searchBarAccessory.value.value,
      "editor",
      "a base chosen explicitly inside a command conversation is remembered; switching back to the command is not",
    );
  },
);

test(
  "AI Commands handles failed remove, reset and delete-all writes and remains usable for retry",
  native,
  async (t) => {
    const { DEFAULT_COMMANDS } = require("../src/utils/model-defaults.ts");
    const builtin = Object.values(DEFAULT_COMMANDS)[0];
    const custom = { ...builtin, id: "custom", name: "Custom command", model: "custom-model" };
    const app = await launch("search-ai-command", {
      commands: JSON.stringify({ [builtin.id]: { ...builtin, model: "edited-builtin" }, custom }),
    });
    t.after(app.close);
    await app.waitFor((tree) => body(tree).kind === "List" && !body(tree).isLoading);
    const previous = app.storage.get(CATALOG_STORAGE_KEY);
    app.failStorageWrites("Disk full");
    for (const [index, [id, title]] of [
      [custom.id, "Remove"],
      [builtin.id, "Reset"],
      [builtin.id, "Delete All"],
    ].entries()) {
      await select(app, id);
      const submitted = action(app, title);
      await app.waitFor(() => app.alerts[index]);
      await app.callback(app.alerts[index].primaryAction.onAction);
      await submitted;
      await app.waitFor(
        () =>
          app.methods.filter((m) => m.method === "showToast" && m.params.title === "Could not save configuration")
            .length ===
          index + 1,
      );
      assert.equal(app.storage.get(CATALOG_STORAGE_KEY), previous);
    }
    app.failStorageWrites(undefined);
    await select(app, custom.id);
    const submitted = action(app, "Remove");
    await app.waitFor(() => app.alerts[3]);
    await app.callback(app.alerts[3].primaryAction.onAction);
    await submitted;
    await app.waitFor(
      (tree) =>
        !body(tree)
          .sections.flatMap((section) => section.items)
          .some((item) => item.id === custom.id),
    );
    assert.equal(JSON.parse(app.storage.get(CATALOG_STORAGE_KEY)).commands.custom, undefined);
    assert.ok(!app.methods.some((m) => m.method === "commandException"));
  },
);

test(
  "inherited commands override each setting locally, detach with effective values and return to live inheritance",
  native,
  async (t) => {
    const api = await provider(t);
    const app = await launch("model", fixture, api.prefs);
    t.after(app.close);
    await app.waitFor(page("Models"));
    await select(app, "writer");
    await action(app, "Create AI Command from This Model");
    await app.waitFor(page("Create AI Command"));
    assert.equal(value(app.tree, "configurationMode"), "inherit");
    await app.waitFor((tree) => !field(tree, "model").isLoading);
    assert.equal(value(app.tree, "model"), writer.option, "remote options do not replace the inherited model ID");
    assert.match(field(app.tree, "model").info, /Inherited from Writer/);
    await change(app, "name", "Local overrides");
    await action(app, "Edit Base Model");
    await app.waitFor(page("Edit Model"));
    await change(app, "reasoningEffort", "low");
    await submit(app, "Submit");
    await app.waitFor(page("Create AI Command"));
    assert.equal(value(app.tree, "reasoningEffort"), "low", "untouched fields show live inherited values");
    await change(app, "enableReasoningEffortChange", false);
    await change(app, "enableReasoningEffortChange", true);
    assert.equal(value(app.tree, "reasoningEffort"), "low", "customizing reasoning keeps the latest inherited effort");
    for (const flag of [
      "overrideModel",
      "overrideTemperature",
      "overrideReasoning",
      "overrideVision",
      "overridePrompt",
    ])
      assert.equal(field(app.tree, flag), undefined, "settings are editable without override checkboxes");
    await chooseCustomModel(app, "model", "command-v1");
    assert.match(field(app.tree, "model").info, /Customized/);
    await change(app, "temperature", "0.9");
    await change(app, "enableReasoningEffortChange", false);
    await change(app, "vision", true);
    await change(app, "vision", false);
    await change(app, "prompt", "Command instructions");
    await action(app, "Edit Base Model");
    await app.waitFor(page("Edit Model"));
    await chooseCustomModel(app, "option", "writer-v2");
    await change(app, "temperature", "0.6");
    await change(app, "reasoningEffort", "low");
    await change(app, "vision", true);
    await change(app, "prompt", "Updated base instructions");
    await submit(app, "Submit");
    await app.waitFor(page("Create AI Command"));
    assert.equal(value(app.tree, "model"), "command-v1");
    await submit(app, "Save AI Command");
    await app.waitFor(page("Models"));
    const catalog = JSON.parse(app.storage.get(CATALOG_STORAGE_KEY));
    const saved = Object.values(catalog.commands).find((cmd) => cmd.name === "Local overrides");
    assert.equal(catalog.models.writer.option, "writer-v2");
    assert.equal(catalog.models.writer.temperature, "0.6");
    assert.equal(catalog.models.writer.vision, true);
    assert.equal(saved.vision, false);
    await select(app, `command-${saved.id}`);
    await action(app, "Run AI Command");
    await app.waitFor((tree) => body(tree).kind === "Detail" && body(tree).markdown?.includes("Fixture answer"));
    assert.equal(api.requests[0].model, "command-v1");
    assert.equal(api.requests[0].temperature, 0.9);
    assert.equal(api.requests[0].reasoning_effort, undefined);
    assert.equal(api.requests[0].messages[0].content, "Command instructions");
    await back(app);
    await app.waitFor(page("Models"));
    await action(app, "Edit AI Command");
    await app.waitFor(page("Edit AI Command"));
    await change(app, "configurationMode", "independent");
    assert.equal(value(app.tree, "model"), "command-v1");
    assert.equal(value(app.tree, "temperature"), "0.9");
    assert.equal(value(app.tree, "enableReasoningEffortChange"), false);
    assert.equal(value(app.tree, "vision"), false);
    assert.equal(value(app.tree, "prompt"), "Command instructions");
    await submit(app, "Save AI Command");
    await app.waitFor(page("Models"));
    assert.equal(JSON.parse(app.storage.get(CATALOG_STORAGE_KEY)).commands[saved.id].baseModelId, undefined);
    await action(app, "Edit AI Command");
    await app.waitFor(page("Edit AI Command"));
    await change(app, "configurationMode", "inherit");
    await change(app, "baseModelId", "writer");
    await action(app, "Reset Temperature to Base");
    await app.waitFor((tree) => value(tree, "temperature") === "0.6");
    assert.equal(value(app.tree, "model"), "command-v1", "resetting temperature keeps other custom settings");
    assert.equal(value(app.tree, "prompt"), "Command instructions");
    await action(app, "Restore All Inherited Settings");
    await app.waitFor((tree) => value(tree, "model") === "writer-v2");
    await chooseCustomModel(app, "model", "temporary-model");
    await action(app, "Reset Model to Base");
    await app.waitFor((tree) => value(tree, "model") === "writer-v2");
    assert.equal(value(app.tree, "model"), "writer-v2", "restoring inheritance uses the latest base value");
    assert.match(field(app.tree, "model").info, /Inherited from Writer/);
    await change(app, "configurationMode", "independent");
    assert.equal(value(app.tree, "model"), "writer-v2");
    assert.equal(value(app.tree, "temperature"), "0.6");
    assert.equal(value(app.tree, "reasoningEffort"), "low");
    assert.equal(value(app.tree, "vision"), true);
    assert.equal(value(app.tree, "prompt"), "Updated base instructions");
    await change(app, "configurationMode", "inherit");
    await submit(app, "Save AI Command");
    await app.waitFor(page("Models"));
    await action(app, "Run AI Command");
    await app.waitFor((tree) => body(tree).kind === "Detail" && body(tree).markdown?.includes("Fixture answer"));
    await action(app, "Continue in Chat");
    await app.waitFor(page("Ask"));
    assert.equal(body(app.tree).searchBarAccessory.value.value, `command-${saved.id}`);
    await app.callback(body(app.tree).onSearchTextChange, { value: "Next question", eventCount: ++eventCount });
    await app.waitFor((tree) => body(tree).searchBarText.value === "Next question");
    await action(app, "Get Answer");
    await app.waitFor((tree) => !body(tree).isLoading && api.requests.length === 3);
    assert.equal(api.requests[2].model, "writer-v2");
    assert.equal(api.requests[2].temperature, 0.6);
    assert.equal(api.requests[2].reasoning_effort, "low");
    assert.equal(api.requests[2].messages[0].content, "Updated base instructions");
  },
);

test(
  "Models creates a command from the selected preset, edits its override, runs it and continues in Ask",
  native,
  async (t) => {
    const api = await provider(t);
    const app = await launch("model", fixture, api.prefs);
    t.after(app.close);
    await app.waitFor(page("Models"));
    await select(app, "writer");
    await action(app, "Create AI Command from This Model");
    await app.waitFor(page("Create AI Command"));
    assert.equal(value(app.tree, "baseModelId"), "writer");
    assert.equal(field(app.tree, "overridePrompt"), undefined);
    assert.equal(value(app.tree, "prompt"), writer.prompt);
    assert.equal(value(app.tree, "model"), writer.option);
    assert.equal(
      body(app.tree).items.some((item) => item.title === "Base Settings"),
      false,
    );
    await change(app, "model", writer.option);
    await change(app, "reasoningEffort", writer.reasoningEffort);
    await change(app, "name", "Rewrite selection");
    await submit(app, "Save AI Command");
    await app.waitFor(page("Models"));
    const saved = Object.values(JSON.parse(app.storage.get(CATALOG_STORAGE_KEY)).commands).find(
      (cmd) => cmd.name === "Rewrite selection",
    );
    assert.ok(saved);
    assert.equal(saved.baseModelId, "writer");
    assert.equal(saved.overridePrompt, false);
    assert.equal(saved.overrideModel, false, "a native echo of the displayed value does not customize it");
    assert.equal(saved.overrideReasoning, false);
    assert.equal(body(app.tree).selectedItemId.value, `command-${saved.id}`);
    await select(app, `command-${saved.id}`);
    assert.equal(body(app.tree).detail.markdown, writer.prompt);
    assert.ok(actions(app.tree).some((item) => item.title === "Ask with This Command"));
    assert.ok(!actions(app.tree).some((item) => item.title === "Ask with This Model"));
    await action(app, "Edit AI Command");
    await app.waitFor(page("Edit AI Command"));
    await change(app, "prompt", "Only output corrected text");
    await submit(app, "Save AI Command");
    await app.waitFor((tree) => page("Models")(tree) && body(tree).detail.markdown === "Only output corrected text");
    assert.equal(api.requests.length, 0);
    await action(app, "Run AI Command");
    await app.waitFor((tree) => body(tree).kind === "Detail" && body(tree).markdown?.includes("Fixture answer"));
    assert.equal(api.requests.length, 1);
    assert.equal(api.requests[0].model, "writer-v1");
    assert.equal(api.requests[0].temperature, 0.2);
    assert.equal(api.requests[0].reasoning_effort, "high");
    assert.equal(api.requests[0].messages[0].content, "Only output corrected text");
    await action(app, "Continue in Chat");
    await app.waitFor(page("Ask"));
    assert.equal(body(app.tree).searchBarAccessory.value.value, `command-${saved.id}`);
    assert.equal(
      menuItems(body(app.tree).searchBarAccessory).find((item) => item.id === `command-${saved.id}`).title,
      "Command: Rewrite selection",
    );
    await action(app, "Full Text Input");
    await app.waitFor((tree) => field(tree, "question"));
    await change(app, "question", "Follow up");
    await action(app, "Edit AI Command");
    await app.waitFor(page("Edit AI Command"));
    assert.equal(value(app.tree, "prompt"), "Only output corrected text");
    await change(app, "name", "Revised rewrite");
    await change(app, "prompt", "Updated command instructions");
    await submit(app, "Save AI Command");
    await app.waitFor((tree) => field(tree, "question"));
    assert.equal(value(app.tree, "question"), "Follow up");
    assert.equal(
      menuItems(field(app.tree, "model")).find((item) => item.id === `command-${saved.id}`).title,
      "Command: Revised rewrite",
    );
    await submit(app, "Submit");
    await app.waitFor(page("Ask"));
    await app.waitFor((tree) => !body(tree).isLoading && api.requests.length === 2);
    assert.equal(api.requests[1].model, writer.option);
    assert.equal(api.requests[1].messages[0].content, "Updated command instructions");
    assert.equal(api.requests.length, 2, "editing must not rerun the command behind the current page");
    assert.equal(JSON.parse(app.storage.get(CATALOG_STORAGE_KEY)).models.writer.prompt, writer.prompt);
    assert.equal(
      menuItems(body(app.tree).searchBarAccessory).find((item) => item.id === `command-${saved.id}`).title,
      "Command: Revised rewrite",
    );
  },
);

test(
  "Models to Ask selects explicitly, edits retain drafts, full input sends the updated model and returns once",
  native,
  async (t) => {
    const api = await provider(t);
    const app = await launch("model", fixture, api.prefs);
    t.after(app.close);
    await app.waitFor(page("Models"));
    await select(app, "default");
    await action(app, "Ask with This Model");
    await app.waitFor(page("Ask"));
    assert.ok(
      actions(app.tree).some((item) => item.title === "Edit Model"),
      "edit is available before typing",
    );
    await back(app);
    await app.waitFor(page("Models"));
    await select(app, "writer");
    await action(app, "Ask with This Model");
    await app.waitFor(page("Ask"));
    assert.equal(
      body(app.tree).searchBarAccessory.value.value,
      "writer",
      "explicit selection beats the default cached by previous Ask",
    );
    await app.callback(body(app.tree).onSearchTextChange, { value: "Keep this draft", eventCount: ++eventCount });
    await app.waitFor((tree) => body(tree).searchBarText.value === "Keep this draft");
    await action(app, "Edit Model");
    await app.waitFor(page("Edit Model"));
    await change(app, "option", "writer-v2");
    await submit(app, "Submit");
    await app.waitFor(page("Ask"));
    assert.equal(body(app.tree).searchBarText.value, "Keep this draft");
    await action(app, "Full Text Input");
    await app.waitFor((tree) => body(tree).kind === "Form" && field(tree, "question"));
    await change(app, "question", "Full input draft");
    await action(app, "Edit Model");
    await app.waitFor(page("Edit Model"));
    await change(app, "prompt", "Updated instructions");
    await submit(app, "Submit");
    await app.waitFor((tree) => body(tree).kind === "Form" && value(tree, "question") === "Full input draft");
    assert.equal(api.requests.length, 0);
    await submit(app, "Submit");
    await app.waitFor(
      (tree) =>
        page("Ask")(tree) &&
        body(tree)
          .sections.flatMap((section) => section.items)
          .some((item) => item.title === "Full input draft"),
    );
    await app.waitFor((tree) => body(tree).isLoading === false);
    assert.equal(api.requests.length, 1);
    assert.equal(api.requests[0].model, "writer-v2");
    assert.equal(api.requests[0].messages[0].content, "Updated instructions");
    await back(app);
    await app.waitFor(page("Models"));
    assert.equal(body(app.tree).selectedItemId.value, "writer");
  },
);

test(
  "automatic full input opens once, follows its own model selection and keeps the form after editing",
  native,
  async (t) => {
    const api = await provider(t);
    const app = await launch("model", fixture, { ...api.prefs, isAutoFullInput: true });
    t.after(app.close);
    await app.waitFor(page("Models"));
    await select(app, "writer");
    await action(app, "Ask with This Model");
    await app.waitFor((tree) => body(tree).kind === "Form" && field(tree, "question"));
    assert.equal(value(app.tree, "model"), "writer");
    await change(app, "question", "Automatic input draft");
    await change(app, "model", "default");
    await action(app, "Edit Model");
    await app.waitFor(page("Edit Model"));
    assert.equal(value(app.tree, "name"), "Default");
    await change(app, "option", "edited-default");
    await submit(app, "Submit");
    await app.waitFor((tree) => body(tree).kind === "Form" && value(tree, "question") === "Automatic input draft");
    assert.equal(value(app.tree, "model"), "default");
    await submit(app, "Submit");
    await app.waitFor(
      (tree) =>
        page("Ask")(tree) &&
        body(tree)
          .sections.flatMap((section) => section.items)
          .some((item) => item.title === "Automatic input draft"),
    );
    assert.equal(api.requests.length, 1);
    assert.equal(api.requests[0].model, "edited-default");
    await back(app);
    await app.waitFor(page("Models"));
    assert.equal(
      body(app.tree).selectedItemId.value,
      "writer",
      "one back from Ask returns to the original Models selection",
    );
  },
);

test(
  "automatic full input keeps selected text until submitted, then clears the underlying Ask draft",
  native,
  async (t) => {
    const api = await provider(t);
    const app = await launch("model", fixture, { ...api.prefs, isAutoFullInput: true, isAutoLoadText: true });
    t.after(app.close);
    await app.waitFor(page("Models"));
    await select(app, "writer");
    await action(app, "Ask with This Model");
    await app.waitFor(
      (tree) => body(tree).kind === "Form" && value(tree, "question") === "Text to rewrite",
      "full input with selected text",
    );
    assert.equal(value(app.tree, "model"), "writer");
    await back(app);
    await app.waitFor(page("Ask"));
    assert.equal(body(app.tree).searchBarText.value, "Text to rewrite", "cancel preserves the draft");
    await action(app, "Full Text Input");
    await app.waitFor((tree) => body(tree).kind === "Form");
    await submit(app, "Submit");
    await app.waitFor((tree) => page("Ask")(tree) && api.requests.length === 1);
    assert.equal(body(app.tree).searchBarText.value, "");
    assert.ok(!actions(app.tree).some((item) => item.title === "Get Answer"));
    assert.equal(api.requests[0].messages.at(-1).content, "Text to rewrite");
  },
);

test(
  "three consecutive questions keep prior turns in chronological order after editing the model",
  native,
  async (t) => {
    const api = await provider(t);
    const app = await launch("model", fixture, api.prefs);
    t.after(app.close);
    await app.waitFor(page("Models"));
    await select(app, "writer");
    await action(app, "Ask with This Model");
    await app.waitFor(page("Ask"));
    for (const [index, question] of ["First question", "Second question", "Third question"].entries()) {
      await app.callback(body(app.tree).onSearchTextChange, { value: question, eventCount: ++eventCount });
      await app.waitFor((tree) => body(tree).searchBarText.value === question);
      if (index === 2) {
        await action(app, "Edit Model");
        await app.waitFor(page("Edit Model"));
        await change(app, "temperature", "0.9");
        await submit(app, "Submit");
        await app.waitFor(page("Ask"));
      }
      await action(app, "Get Answer");
      await app.waitFor(
        (tree) =>
          !body(tree).isLoading &&
          api.requests.length === index + 1 &&
          body(tree).sections.flatMap((section) => section.items).length === index + 1,
        `answer ${index + 1}`,
      );
      assert.equal(body(app.tree).searchBarText.value, "");
    }
    assert.deepEqual(api.requests[2].messages, [
      { role: "system", content: writer.prompt },
      { role: "user", content: "First question" },
      { role: "assistant", content: "Fixture answer" },
      { role: "user", content: "Second question" },
      { role: "assistant", content: "Fixture answer" },
      { role: "user", content: "Third question" },
    ]);
    assert.equal(api.requests[2].temperature, 0.9);
  },
);

test("Ask and Full Text Input list only base models and submit the selected base settings", native, async (t) => {
  const api = await provider(t);
  const app = await launch("ask", fixture, api.prefs);
  t.after(app.close);
  await app.waitFor(page("Ask"));
  const dropdownItems = (dropdown) => dropdown.menu.sections.flatMap((section) => section.items).map((item) => item.id);
  assert.ok(Object.keys(JSON.parse(app.storage.get(CATALOG_STORAGE_KEY)).commands).length > 0);
  assert.deepEqual(dropdownItems(body(app.tree).searchBarAccessory).sort(), ["default", "writer"]);
  await action(app, "Full Text Input");
  await app.waitFor((tree) => body(tree).kind === "Form" && field(tree, "question"));
  assert.deepEqual(dropdownItems(field(app.tree, "model")).sort(), ["default", "writer"]);
  await change(app, "model", "writer");
  await change(app, "question", "A normal question");
  await submit(app, "Submit");
  await app.waitFor((tree) => page("Ask")(tree) && api.requests.length === 1);
  assert.equal(api.requests[0].model, writer.option);
  assert.equal(api.requests[0].messages[0].content, writer.prompt);
});

test("Ask without an explicit preset restores the last model across separate command launches", native, async (t) => {
  const support = cacheDirectory(t);
  const savedStorage = await rememberWriter(support);
  let app = await launch("ask", savedStorage, {}, { supportDirectory: support });
  t.after(() => app.close());
  await app.waitFor(page("Ask"));
  assert.equal(body(app.tree).searchBarAccessory.value.value, "writer");
  await app.callback(body(app.tree).searchBarAccessory.onChange, { value: "default", eventCount: ++eventCount });
  await app.waitFor((tree) => body(tree).searchBarAccessory.value.value === "default");
  await app.close();
  app = await launch("ask", savedStorage, {}, { supportDirectory: support });
  await app.waitFor(page("Ask"));
  assert.equal(body(app.tree).searchBarAccessory.value.value, "default", "manual dropdown changes are remembered");
  await action(app, "Full Text Input");
  await app.waitFor((tree) => body(tree).kind === "Form" && field(tree, "question"));
  await change(app, "model", "writer");
  await change(app, "model", "default");
  await back(app);
  await app.waitFor(page("Ask"));
  assert.equal(body(app.tree).searchBarAccessory.value.value, "default", "switching back updates Ask's selection");
  await action(app, "Full Text Input");
  await app.waitFor((tree) => body(tree).kind === "Form" && field(tree, "question"));
  await change(app, "model", "writer");
  await app.close();
  app = await launch("ask", savedStorage, {}, { supportDirectory: support });
  await app.waitFor(page("Ask"));
  assert.equal(body(app.tree).searchBarAccessory.value.value, "writer", "manual full-input changes are remembered");
});

test(
  "Ask replaces an old remembered command with its base model and persists the repaired selection",
  native,
  async (t) => {
    const support = cacheDirectory(t);
    const app = await launch(
      "ask",
      commandFixture,
      {},
      {
        supportDirectory: support,
        initialCache: { select_model: "command-rewrite" },
      },
    );
    t.after(app.close);
    await app.waitFor(page("Ask"));
    assert.equal(body(app.tree).searchBarAccessory.value.value, "writer");
    const catalog = JSON.parse(app.storage.get(CATALOG_STORAGE_KEY));
    delete catalog.commands.rewrite;
    const savedStorage = { [CATALOG_STORAGE_KEY]: JSON.stringify(catalog) };
    await app.close();
    const reopened = await launch("ask", savedStorage, {}, { supportDirectory: support });
    t.after(reopened.close);
    await reopened.waitFor(page("Ask"));
    assert.equal(
      body(reopened.tree).searchBarAccessory.value.value,
      "writer",
      "cache no longer depends on the command",
    );
  },
);

test(
  "Ask replaces a remembered preset that no longer exists and persists the repaired selection",
  native,
  async (t) => {
    const support = cacheDirectory(t);
    const app = await launch(
      "ask",
      fixture,
      {},
      { supportDirectory: support, initialCache: { select_model: "retired" } },
    );
    t.after(app.close);
    await app.waitFor(page("Ask"));
    assert.equal(body(app.tree).searchBarAccessory.value.value, "default");
    const catalog = JSON.parse(app.storage.get(CATALOG_STORAGE_KEY));
    catalog.models.retired = { ...writer, id: "retired", name: "Retired" };
    await app.close();
    // Restoring the ID proves the cache was rewritten instead of resolving the stale ID again.
    const reopened = await launch(
      "ask",
      { [CATALOG_STORAGE_KEY]: JSON.stringify(catalog) },
      {},
      { supportDirectory: support },
    );
    t.after(reopened.close);
    await reopened.waitFor(page("Ask"));
    assert.equal(body(reopened.tree).searchBarAccessory.value.value, "default", "the repaired choice was remembered");
  },
);

test(
  "Summarize repairs a command selection and submits exactly once with the displayed base model",
  native,
  async (t) => {
    const api = await provider(t);
    const app = await launch("summarize", commandFixture, api.prefs, {
      browserExtension: true,
      initialCache: { select_model: "command-rewrite" },
    });
    t.after(app.close);
    await app.waitFor((tree) => field(tree, "model") && !body(tree).isLoading);
    assert.deepEqual(
      field(app.tree, "model")
        .menu.sections.flatMap((section) => section.items)
        .map((item) => item.id)
        .sort(),
      ["default", "writer"],
    );
    assert.equal(value(app.tree, "model"), "writer");
    const question = value(app.tree, "question");
    assert.match(question, /Fixture page content/);
    await action(app, "Submit");
    await app.waitFor((tree) => page("Ask")(tree) && api.requests.length > 0);
    assert.equal(api.requests.length, 1);
    assert.equal(body(app.tree).searchBarAccessory.value.value, "writer");
    assert.deepEqual(api.requests[0].messages, [
      { role: "system", content: writer.prompt },
      { role: "user", content: question },
    ]);
    assert.equal(api.requests[0].model, writer.option);
    await action(app, "Edit Model");
    await app.waitFor(page("Edit Model"));
    await change(app, "temperature", "0.7");
    await submit(app, "Submit");
    await app.waitFor(page("Ask"));
    assert.equal(api.requests.length, 1, "model updates do not resubmit the initial summary");
  },
);

test(
  "an old command conversation resumes with labeled command settings and retains its messages",
  native,
  async (t) => {
    const api = await provider(t);
    const conversation = {
      id: "past-command-conversation",
      model: {
        ...writer,
        id: "command-rewrite",
        name: "Rewrite",
        option: inheritedCommand.model,
        prompt: inheritedCommand.prompt,
      },
      chats: [
        { id: "past-chat", question: "Past question", answer: "Past answer", created_at: "2026-09-10T00:00:00Z" },
      ],
      pinned: false,
      created_at: "2026-09-10T00:00:00Z",
      updated_at: "2026-09-10T00:00:00Z",
    };
    const app = await launch(
      "conversation",
      { ...commandFixture, conversations: JSON.stringify([conversation]) },
      api.prefs,
    );
    t.after(app.close);
    await app.waitFor((tree) => body(tree).kind === "List" && !body(tree).isLoading);
    const savedItem = body(app.tree)
      .sections.flatMap((section) => section.items)
      .find((item) => item.id === conversation.id);
    assert.ok(savedItem.accessories.some((accessory) => accessory.tag === "Command: Rewrite"));
    await select(app, conversation.id);
    await action(app, "Continue Ask");
    await app.waitFor(page("Ask"));
    assert.equal(body(app.tree).searchBarAccessory.value.value, "command-rewrite");
    assert.equal(
      menuItems(body(app.tree).searchBarAccessory).find((item) => item.id === "command-rewrite").title,
      "Command: Rewrite",
    );
    await app.callback(body(app.tree).onSearchTextChange, { value: "Next question", eventCount: ++eventCount });
    await app.waitFor((tree) => body(tree).searchBarText.value === "Next question");
    await action(app, "Get Answer");
    await app.waitFor((tree) => page("Ask")(tree) && api.requests.length === 1);
    assert.equal(api.requests[0].model, inheritedCommand.model);
    assert.deepEqual(api.requests[0].messages, [
      { role: "system", content: inheritedCommand.prompt },
      { role: "user", content: "Past question" },
      { role: "assistant", content: "Past answer" },
      { role: "user", content: "Next question" },
    ]);
  },
);

test(
  "Ask with This Command starts a labeled command conversation without replacing the remembered base",
  native,
  async (t) => {
    const api = await provider(t);
    const support = cacheDirectory(t);
    const solo = {
      id: "solo",
      name: "Solo",
      configurationMode: "independent",
      model: "solo-model",
      prompt: "Solo instructions",
      temperature: "0.5",
      contentSource: "selectedText",
      isDisplayInput: true,
    };
    const initialStorage = await rememberWriter(support, { ...fixture, commands: JSON.stringify({ solo }) }, api.prefs);
    const app = await launch("model", initialStorage, api.prefs, { supportDirectory: support });
    t.after(app.close);
    await app.waitFor(page("Models"));
    await select(app, "command-solo");
    await action(app, "Ask with This Command");
    await app.waitFor(page("Ask"));
    assert.equal(body(app.tree).searchBarAccessory.value.value, "command-solo");
    assert.deepEqual(
      menuItems(body(app.tree).searchBarAccessory)
        .map((item) => item.id)
        .sort(),
      ["command-solo", "default", "writer"],
    );
    assert.equal(
      menuItems(body(app.tree).searchBarAccessory).find((item) => item.id === "command-solo").title,
      "Command: Solo",
    );
    await app.callback(body(app.tree).onSearchTextChange, { value: "Solo question", eventCount: ++eventCount });
    await app.waitFor((tree) => body(tree).searchBarText.value === "Solo question");
    await action(app, "Get Answer");
    await app.waitFor((tree) => !body(tree).isLoading && api.requests.length === 1);
    assert.equal(api.requests[0].model, "solo-model");
    assert.equal(api.requests[0].temperature, 0.5);
    assert.deepEqual(api.requests[0].messages, [
      { role: "system", content: "Solo instructions" },
      { role: "user", content: "Solo question" },
    ]);
    const savedStorage = Object.fromEntries(app.storage);
    await app.close();
    const ordinaryAsk = await launch("ask", savedStorage, api.prefs, { supportDirectory: support });
    t.after(ordinaryAsk.close);
    await ordinaryAsk.waitFor(page("Ask"));
    // An independent command written to the cache would resolve to Default instead.
    assert.equal(body(ordinaryAsk.tree).searchBarAccessory.value.value, "writer");
  },
);

test("continuing a saved conversation uses its model without replacing Ask's remembered model", native, async (t) => {
  const support = cacheDirectory(t);
  const initialStorage = await rememberWriter(support);
  const conversation = {
    id: "past-conversation",
    model: DEFAULT_MODEL,
    chats: [{ id: "past-chat", question: "Past question", answer: "Past answer", created_at: "2026-09-10T00:00:00Z" }],
    pinned: false,
    created_at: "2026-09-10T00:00:00Z",
    updated_at: "2026-09-10T00:00:00Z",
  };
  const app = await launch(
    "conversation",
    {
      ...initialStorage,
      conversations: JSON.stringify([conversation]),
    },
    {},
    { supportDirectory: support },
  );
  t.after(app.close);
  await app.waitFor((tree) => body(tree).kind === "List" && !body(tree).isLoading);
  await select(app, conversation.id);
  await action(app, "Continue Ask");
  await app.waitFor(page("Ask"));
  assert.equal(body(app.tree).searchBarAccessory.value.value, "default");
  const savedStorage = Object.fromEntries(app.storage);
  await app.close();
  const ordinaryAsk = await launch("ask", savedStorage, {}, { supportDirectory: support });
  t.after(ordinaryAsk.close);
  await ordinaryAsk.waitFor(page("Ask"));
  assert.equal(body(ordinaryAsk.tree).searchBarAccessory.value.value, "writer");
});

test("Models pin actions preserve settings saved after the list was loaded", native, async (t) => {
  const app = await launch("model", fixture);
  t.after(app.close);
  await app.waitFor(page("Models"));
  await select(app, "writer");
  const other = createModelCatalog({
    getItem: async (key) => app.storage.get(key),
    setItem: async (key, value) => app.storage.set(key, value),
  });
  await other.load();
  await other.saveModel({ ...writer, prompt: "Edited in another invocation" });
  await action(app, "Pin Model");
  await app.waitFor((tree) => actions(tree).some((item) => item.title === "Unpin Model"));
  let saved = JSON.parse(app.storage.get(CATALOG_STORAGE_KEY)).models.writer;
  assert.equal(saved.pinned, true);
  assert.equal(saved.prompt, "Edited in another invocation");
  assert.equal(body(app.tree).detail.markdown, "Edited in another invocation");
  await action(app, "Unpin Model");
  await app.waitFor((tree) => actions(tree).some((item) => item.title === "Pin Model"));
  saved = JSON.parse(app.storage.get(CATALOG_STORAGE_KEY)).models.writer;
  assert.equal(saved.pinned, false);
  assert.equal(saved.prompt, "Edited in another invocation");
});

test("creating an ordinary model returns to Models with the new preset selected", native, async (t) => {
  const api = await provider(t);
  const app = await launch("model", fixture, api.prefs);
  t.after(app.close);
  await app.waitFor(page("Models"));
  await action(app, "Create Model");
  await app.waitFor(page("Create Model"));
  await change(app, "name", "Research");
  await chooseCustomModel(app, "option", "research-model");
  await submit(app, "Submit");
  await app.waitFor(page("Models"));
  const saved = Object.values(JSON.parse(app.storage.get(CATALOG_STORAGE_KEY)).models).find(
    (model) => model.name === "Research",
  );
  assert.ok(saved);
  assert.equal(saved.option, "research-model");
  assert.equal(body(app.tree).selectedItemId.value, saved.id);
});

test("model import can be canceled, retried after a write failure, and then persisted", native, async (t) => {
  const fs = require("node:fs");
  const path = require("node:path");
  const os = require("node:os");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chatgpt-import-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const app = await launch("model", fixture);
  t.after(app.close);
  await app.waitFor(page("Models"));
  await select(app, "writer");
  const catalog = JSON.parse(app.storage.get(CATALOG_STORAGE_KEY));
  const imported = {
    ...catalog.models,
    writer: { ...catalog.models.writer, prompt: "Imported prompt", option: "imported-model" },
  };
  const file = path.join(dir, "models.json");
  fs.writeFileSync(file, JSON.stringify(imported));
  await action(app, "Import Models");
  await app.waitFor((tree) => body(tree).kind === "Form" && field(tree, "files"));
  let submitting = action(app, "Import Models", { files: { value: [file] } });
  await app.waitFor(() => app.alerts[0], "import confirmation");
  await app.callback(app.alerts[0].dismissAction.onAction);
  await submitting;
  assert.equal(body(app.tree).kind, "Form");
  assert.deepEqual(JSON.parse(app.storage.get(CATALOG_STORAGE_KEY)), catalog);
  app.failStorageWrites("Disk full");
  submitting = action(app, "Import Models", { files: { value: [file] } });
  await app.waitFor(() => app.alerts[1]);
  await app.callback(app.alerts[1].primaryAction.onAction);
  await submitting;
  assert.equal(body(app.tree).kind, "Form");
  assert.deepEqual(JSON.parse(app.storage.get(CATALOG_STORAGE_KEY)), catalog);
  await app.waitFor(() =>
    app.methods.some((method) => method.method === "showToast" && method.params.title === "Import failed"),
  );
  app.failStorageWrites(undefined);
  submitting = action(app, "Import Models", { files: { value: [file] } });
  await app.waitFor(() => app.alerts[2]);
  await app.callback(app.alerts[2].primaryAction.onAction);
  await submitting;
  await app.waitFor((tree) => page("Models")(tree) && body(tree).detail.markdown === "Imported prompt");
  const persisted = JSON.parse(app.storage.get(CATALOG_STORAGE_KEY));
  assert.equal(persisted.models.writer.option, "imported-model");
  assert.deepEqual(persisted.commands, catalog.commands);
  const { createModelCatalog } = require("../src/utils/model-catalog.ts");
  const restarted = createModelCatalog({
    getItem: async (key) => app.storage.get(key),
    setItem: async (key, val) => app.storage.set(key, val),
  });
  await restarted.load();
  assert.equal(restarted.getSnapshot().models.writer.prompt, "Imported prompt");
});

test(
  "conversation import stays open on cancel and returns with the imported conversation on confirmation",
  native,
  async (t) => {
    const fs = require("node:fs");
    const path = require("node:path");
    const os = require("node:os");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chatgpt-conversation-import-test-"));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const app = await launch("conversation");
    t.after(app.close);
    await app.waitFor((tree) => body(tree).kind === "List" && !body(tree).isLoading);
    const conversation = {
      id: "imported-conversation",
      model: writer,
      chats: [
        {
          id: "saved-chat",
          question: "Imported question",
          answer: "Saved answer",
          files: [],
          created_at: "2026-09-10T12:00:00Z",
        },
      ],
      created_at: "2026-09-10T12:00:00Z",
      updated_at: "2026-09-10T12:00:00Z",
      pinned: false,
    };
    const file = path.join(dir, "conversations.json");
    fs.writeFileSync(file, JSON.stringify([conversation]));
    await action(app, "Import Conversation");
    await app.waitFor((tree) => body(tree).kind === "Form");
    const before = app.storage.get("conversations");
    let submitting = action(app, "Import Conversation", { files: { value: [file] } });
    await app.waitFor(() => app.alerts[0]);
    await app.callback(app.alerts[0].dismissAction.onAction);
    await submitting;
    assert.equal(body(app.tree).kind, "Form");
    assert.equal(app.storage.get("conversations"), before);
    submitting = action(app, "Import Conversation", { files: { value: [file] } });
    await app.waitFor(() => app.alerts[1]);
    await app.callback(app.alerts[1].primaryAction.onAction);
    await submitting;
    await app.waitFor(
      (tree) =>
        body(tree).kind === "List" &&
        body(tree)
          .sections.flatMap((s) => s.items)
          .some((item) => item.id === conversation.id),
    );
    assert.deepEqual(JSON.parse(app.storage.get("conversations")), [conversation]);
    await select(app, conversation.id);
    await action(app, "Import Conversation");
    await app.waitFor((tree) => body(tree).kind === "Form");
    submitting = action(app, "Import Conversation", { files: { value: [file] } });
    await app.waitFor(() => app.alerts[2]);
    await app.callback(app.alerts[2].dismissAction.onAction);
    await submitting;
    assert.equal(body(app.tree).kind, "Form");
    assert.deepEqual(JSON.parse(app.storage.get("conversations")), [conversation]);
  },
);
