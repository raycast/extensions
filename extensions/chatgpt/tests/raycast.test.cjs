const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { launch, available } = require("./raycast-harness.cjs");
const { CATALOG_STORAGE_KEY } = require("../src/utils/model-catalog.ts");

const native = {
  skip: available ? false : "Raycast desktop JavaScript runtime is not installed",
  timeout: 20000,
};
const body = (tree) => tree.navigationStack.body;
const actions = (tree) => tree.actions?.sections.flatMap((section) => section.items) || [];
const page = (title) => (tree) => body(tree).navigationTitle === title && !body(tree).isLoading;
const field = (tree, id) => body(tree).items?.find((item) => item.id === id);

async function action(app, title, data) {
  const item = await app.waitFor((tree) => actions(tree).find((item) => item.title === title), title);
  await app.callback(item.onAction, data);
}

async function provider(t) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.method === "GET" && req.url === "/v1/models") {
      res.end(
        JSON.stringify({
          data: [
            { id: "gpt-6-astra", object: "model" },
            { id: "gpt-6-sol", object: "model" },
            { id: "gpt-6-luna", object: "model" },
            { id: "gpt-5-nano", object: "model" },
          ],
        }),
      );
      return;
    }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    requests.push({ path: req.url, body: JSON.parse(raw) });
    if (req.url.includes("/chat/completions")) {
      res.end(
        JSON.stringify({
          id: "chatcmpl_fixture",
          object: "chat.completion",
          choices: [{ index: 0, message: { role: "assistant", content: "Fixture answer" }, finish_reason: "stop" }],
        }),
      );
      return;
    }
    res.end(
      JSON.stringify({
        id: "resp_fixture",
        object: "response",
        status: "completed",
        output: [
          {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: "Fixture answer", annotations: [] }],
          },
        ],
      }),
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { requests, prefs: { useApiEndpoint: true, apiEndpoint: `http://127.0.0.1:${server.address().port}/v1` } };
}

test("stored models keep their selected model ID", native, async (t) => {
  const old = { id: "default", name: "Default", option: "gpt-4o", prompt: "Help", temperature: "1" };
  const app = await launch("model", { models: JSON.stringify({ default: old }) });
  t.after(app.close);
  await app.waitFor(page("Models"));
  const catalog = JSON.parse(app.storage.get(CATALOG_STORAGE_KEY));
  assert.equal(catalog.models.default.option, "gpt-4o");
});

test("model picker lists every available provider model", native, async (t) => {
  const api = await provider(t);
  const app = await launch("model", {}, api.prefs);
  t.after(app.close);
  await app.waitFor(page("Models"));
  await action(app, "Create Model");
  await app.waitFor(page("Create Model"));
  const modelField = await app.waitFor(
    (tree) =>
      field(tree, "option-available")?.menu?.sections?.some((section) =>
        section.items.some((item) => item.id === "gpt-5-nano"),
      ) && field(tree, "option-available"),
  );
  const options = modelField.menu.sections.flatMap((section) => section.items).map((item) => item.id);
  assert.deepEqual(options, ["gpt-6-astra", "gpt-6-sol", "gpt-6-luna", "gpt-5-nano"]);
});

test("Ask uses GPT-6 Luna and the Responses API", native, async (t) => {
  const api = await provider(t);
  const app = await launch("ask", {}, api.prefs);
  t.after(app.close);
  await app.waitFor(page("Ask"));
  await app.callback(body(app.tree).onSearchTextChange, { value: "Hello", eventCount: 1 });
  await action(app, "Get Answer");
  await app.waitFor((tree) => body(tree).kind === "List" && JSON.stringify(tree).includes("Fixture answer"));
  assert.equal(api.requests.length, 1);
  assert.equal(api.requests[0].path, "/v1/responses");
  assert.equal(api.requests[0].body.model, "gpt-6-luna");
  assert.equal(api.requests[0].body.temperature, undefined);
});

test("Azure Ask keeps the Chat Completions endpoint", native, async (t) => {
  const api = await provider(t);
  const azureEndpoint = api.prefs.apiEndpoint.replace(/\/v1$/, "");
  const app = await launch("ask", {}, {
    ...api.prefs,
    useAzure: true,
    azureEndpoint,
    azureDeployment: "test-deployment",
  });
  t.after(app.close);
  await app.waitFor(page("Ask"));
  await app.callback(body(app.tree).onSearchTextChange, { value: "Hello", eventCount: 1 });
  await action(app, "Get Answer");
  await app.waitFor((tree) => body(tree).kind === "List" && JSON.stringify(tree).includes("Fixture answer"));
  assert.match(api.requests[0].path, /\/openai\/deployments\/test-deployment\/chat\/completions/);
  assert.equal(api.requests[0].body.model, "test-deployment");
});

test("Azure image command uses Chat Completions with image input", native, async (t) => {
  const api = await provider(t);
  const imagePath = path.join(os.tmpdir(), `raycast-chatgpt-image-${process.pid}.png`);
  fs.writeFileSync(
    imagePath,
    Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9KjXcAAAAASUVORK5CYII=", "base64"),
  );
  t.after(() => fs.rmSync(imagePath, { force: true }));
  const app = await launch(
    "ask-clipboard-image",
    {},
    {
      ...api.prefs,
      useAzure: true,
      azureEndpoint: api.prefs.apiEndpoint.replace(/\/v1$/, ""),
      azureDeployment: "test-deployment",
    },
    { clipboardFile: imagePath },
  );
  t.after(app.close);
  await app.waitFor((tree) => body(tree)?.kind === "Detail" && body(tree).markdown?.includes("Fixture answer"));
  assert.match(api.requests[0].path, /\/openai\/deployments\/test-deployment\/chat\/completions/);
  assert.match(JSON.stringify(api.requests[0].body.messages), /image_url/);
});

test("AI Commands send selected text through GPT-6 Responses", native, async (t) => {
  const api = await provider(t);
  const app = await launch("search-ai-command", {}, api.prefs);
  t.after(app.close);
  await app.waitFor((tree) => body(tree).kind === "List" && !body(tree).isLoading);
  const item = await app.waitFor((tree) =>
    body(tree)
      .sections.flatMap((section) => section.items)
      .find((item) => item.title === "Fix Spelling and Grammar"),
  );
  await app.callback(body(app.tree).onSelectionChange, { value: item.id, eventCount: 1 });
  await action(app, "Open AI Command");
  await app.waitFor((tree) => body(tree).kind === "Detail" && body(tree).markdown?.includes("Fixture answer"));
  assert.equal(api.requests[0].path, "/v1/responses");
  assert.equal(api.requests[0].body.model, "gpt-6-luna");
  assert.match(JSON.stringify(api.requests[0].body.input), /Text to rewrite/);
});

test("unauthenticated Models hides catalog while checking sign-in", native, async (t) => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "raycast-codex-logged-out-"));
  t.after(() => fs.rmSync(codexHome, { recursive: true, force: true }));
  const app = await launch("model", {}, { apiKey: "" }, { env: { CODEX_HOME: codexHome } });
  t.after(app.close);
  await app.waitFor((tree) => body(tree)?.isLoading === true);
  assert.ok(!app.storage.has(CATALOG_STORAGE_KEY));
});

test("unauthenticated image command hides image content while checking sign-in", native, async (t) => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "raycast-image-logged-out-"));
  t.after(() => fs.rmSync(codexHome, { recursive: true, force: true }));
  const app = await launch("ask-clipboard-image", {}, { apiKey: "" }, { env: { CODEX_HOME: codexHome } });
  t.after(app.close);
  await app.waitFor((tree) => body(tree)?.isLoading === true);
  assert.ok(!app.methods.some(({ method }) => method === "clipboardRead"));
});
