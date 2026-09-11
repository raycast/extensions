const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { launch, available } = require("./raycast-harness.cjs");
const { DEFAULT_MODEL } = require("../src/utils/model-defaults.ts");
const { CATALOG_STORAGE_KEY } = require("../src/utils/model-catalog.ts");
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
const fixture = { models: JSON.stringify({ writer }), commands: "{}" };
const body = (tree) => tree.navigationStack.body;
const actions = (tree) => tree.actions?.sections.flatMap((s) => s.items) || [];
const field = (tree, id) => body(tree).items?.find((item) => item.id === id);
const value = (tree, id) => field(tree, id)?.value?.value;
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
  const app = await launch("model", initialStorage, prefs, support);
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
    await action(app, "Edit AI Command");
    await app.waitFor(page("Edit AI Command"));
    assert.equal(value(app.tree, "configurationMode"), "independent");
    assert.equal(value(app.tree, "model"), "solo-v1");
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

test("existing command quicklinks run the migrated command and continue with its configuration", native, async (t) => {
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
    { models: fixture.models, commands: JSON.stringify({ [legacy.id]: legacy }) },
    api.prefs,
  );
  const app = await launch("search-ai-command", initialStorage, api.prefs, support, { commandId: legacy.id });
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
  const savedStorage = Object.fromEntries(app.storage);
  await app.close();
  const ordinaryAsk = await launch("ask", savedStorage, api.prefs, support);
  t.after(ordinaryAsk.close);
  await ordinaryAsk.waitFor(page("Ask"));
  assert.equal(
    body(ordinaryAsk.tree).searchBarAccessory.value.value,
    "writer",
    "continuing a command keeps Ask's remembered model",
  );
});

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
    await action(app, "Continue in Chat");
    await app.waitFor(page("Ask"));
    await action(app, "Edit AI Command");
    await app.waitFor(page("Edit AI Command"));
    await change(app, "configurationMode", "independent");
    assert.equal(value(app.tree, "model"), "command-v1");
    assert.equal(value(app.tree, "temperature"), "0.9");
    assert.equal(value(app.tree, "enableReasoningEffortChange"), false);
    assert.equal(value(app.tree, "vision"), false);
    assert.equal(value(app.tree, "prompt"), "Command instructions");
    await submit(app, "Save AI Command");
    await app.waitFor(page("Ask"));
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
    await app.waitFor(page("Ask"));
    await app.callback(body(app.tree).onSearchTextChange, { value: "Next question", eventCount: ++eventCount });
    await app.waitFor((tree) => body(tree).searchBarText.value === "Next question");
    await action(app, "Get Answer");
    await app.waitFor((tree) => !body(tree).isLoading && api.requests.length === 2);
    assert.equal(api.requests[1].model, "writer-v2");
    assert.equal(api.requests[1].temperature, 0.6);
    assert.equal(api.requests[1].reasoning_effort, "low");
    assert.equal(api.requests[1].messages[0].content, "Updated base instructions");
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
    await action(app, "Edit AI Command");
    await app.waitFor(page("Edit AI Command"));
    await change(app, "prompt", "Updated command instructions");
    await submit(app, "Save AI Command");
    await app.waitFor(page("Ask"));
    assert.equal(api.requests.length, 1, "editing must not rerun the command behind the current page");
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

test("Ask without an explicit preset restores the last model across separate command launches", native, async (t) => {
  const support = cacheDirectory(t);
  const savedStorage = await rememberWriter(support);
  let app = await launch("ask", savedStorage, {}, support);
  t.after(() => app.close());
  await app.waitFor(page("Ask"));
  assert.equal(body(app.tree).searchBarAccessory.value.value, "writer");
  await app.callback(body(app.tree).searchBarAccessory.onChange, { value: "default", eventCount: ++eventCount });
  await app.waitFor((tree) => body(tree).searchBarAccessory.value.value === "default");
  await app.close();
  app = await launch("ask", savedStorage, {}, support);
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
  app = await launch("ask", savedStorage, {}, support);
  await app.waitFor(page("Ask"));
  assert.equal(body(app.tree).searchBarAccessory.value.value, "writer", "manual full-input changes are remembered");
});

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
    support,
  );
  t.after(app.close);
  await app.waitFor((tree) => body(tree).kind === "List" && !body(tree).isLoading);
  await select(app, conversation.id);
  await action(app, "Continue Ask");
  await app.waitFor(page("Ask"));
  assert.equal(body(app.tree).searchBarAccessory.value.value, "default");
  const savedStorage = Object.fromEntries(app.storage);
  await app.close();
  const ordinaryAsk = await launch("ask", savedStorage, {}, support);
  t.after(ordinaryAsk.close);
  await ordinaryAsk.waitFor(page("Ask"));
  assert.equal(body(ordinaryAsk.tree).searchBarAccessory.value.value, "writer");
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
