/* eslint-disable @typescript-eslint/no-var-requires */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Load the real source with local replacements for network and Raycast APIs.
function loadSource(file, replacements, globals = {}) {
  const filename = path.join(__dirname, "../src", file);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require: (name) => replacements[name] || require(name),
    Buffer,
    setTimeout,
    clearTimeout,
    ...globals,
  });
  return module.exports;
}

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);
const options = { apiKey: " test-key\n", image: png, size: "full", type: "person", crop: true, scale: "original" };
const result = { results: [{ url: "https://files.example.test/result.png" }] };

async function mockService(t, respond, timers = {}) {
  const calls = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      calls.push({ url: req.url, headers: req.headers, body: Buffer.concat(chunks) });
      respond(req, res);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  });
  const { removeBackground } = loadSource(
    "leonardo.ts",
    {
      https: {
        request(url, init, callback) {
          const original = new URL(url);
          return http.request(`http://127.0.0.1:${server.address().port}${original.pathname}`, init, callback);
        },
      },
    },
    timers
  );
  return { calls, removeBackground };
}

test("sync contract preserves the selected options, raw Base64 and private temporary results", async (t) => {
  const { calls, removeBackground } = await mockService(t, (req, res) => {
    res.end(req.method === "POST" ? JSON.stringify(result) : png);
  });
  assert.deepEqual(await removeBackground(options), png);
  assert.equal(calls[0].url, "/api/rest/v2/generationssync");
  assert.equal(calls[0].headers.authorization, "Bearer test-key");
  assert.equal(calls[0].headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].body), {
    model: "remove-bg",
    ephemeral: true,
    parameters: {
      size: "full",
      type: "person",
      crop: true,
      scale: "original",
      format: "png",
      guidances: { image_reference: [{ image: { type: "BASE64", data: png.toString("base64") } }] },
    },
  });
  assert.equal(calls[1].headers.authorization, undefined);
});

for (const [status, body, message] of [
  [200, { errors: [{ message: "request denied", extensions: { statusCode: 401 } }] }, /API key/],
  [200, { errors: [{ message: "request denied", extensions: { code: "access-denied" } }] }, /API key/],
  [200, { errors: [{ message: "request rejected", extensions: { statusCode: 413 } }] }, /too large/],
  [200, { errors: [{ message: "request rejected", extensions: { statusCode: 429 } }] }, /Wait.*try again/],
  [200, { ...result, errors: [{ message: "generation failed" }] }, /generation failed/],
  [500, result, /HTTP 500/],
  [502, { results: [] }, /HTTP 502/],
  [200, { results: [], blockedCount: 1 }, /moderation/],
  [200, { results: [] }, /no image/],
  [200, "<html>Bad gateway</html>", /invalid response/],
]) {
  test(`rejects HTTP ${status} ${JSON.stringify(body)} without downloading`, async (t) => {
    const { calls, removeBackground } = await mockService(t, (req, res) => {
      res.statusCode = status;
      res.end(typeof body === "string" ? body : JSON.stringify(body));
    });
    await assert.rejects(removeBackground(options), message);
    assert.equal(calls.length, 1);
  });
}

for (const stage of ["generation", "download"]) {
  for (const stalledBody of [false, true]) {
    test(`${stage} deadline covers a stalled ${stalledBody ? "body" : "connection"}`, async (t) => {
      const deadlines = [];
      const { removeBackground } = await mockService(
        t,
        (req, res) => {
          if (stage === "download" && req.method === "POST") return res.end(JSON.stringify(result));
          if (stalledBody) res.write("partial");
        },
        {
          setTimeout(callback, delay) {
            deadlines.push(delay);
            return setTimeout(callback, 50);
          },
        }
      );
      await assert.rejects(removeBackground(options), /timed out|took too long/);
      assert.equal(deadlines.at(-1), stage === "generation" ? 45_000 : 30_000);
    });
  }
}

function mockCommand(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "remove-background-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "photo.jpg");
  const output = path.join(dir, "removed-photo.png");
  fs.writeFileSync(file, png);
  const calls = [];
  const toasts = [];
  let finish;
  const pending = new Promise((resolve) => (finish = resolve));
  const jsx = (type, props) => ({ type, props });
  const { default: Command } = loadSource("index.tsx", {
    "@raycast/api": {
      Form: { TextField: "TextField", Checkbox: "Checkbox", Dropdown: { Item: "Item" } },
      Icon: {},
      ToastStyle: { Success: "success", Failure: "failure" },
      getPreferenceValues: () => ({ leonardoApiKey: "new-key", apiKey: "old-removebg-key" }),
      showToast: (style, message) => toasts.push({ style, message }),
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: { useState: (initial) => [initial, () => undefined], useRef: (initial) => ({ current: initial }) },
    "raycast-toolkit": { Action$: {} },
    "./leonardo": {
      removeBackground(input) {
        calls.push(input);
        return pending;
      },
    },
  });
  const submit = Command().props.actions.props.children[0].props.onSubmit;
  return {
    calls,
    toasts,
    output,
    submit: () => submit({ file, size: "preview", type: "auto", crop: false }),
    async complete() {
      finish(png);
      await new Promise(setImmediate);
    },
  };
}

test("two submits before the next render send one billed request using the new key", async (t) => {
  const command = mockCommand(t);
  command.submit();
  command.submit();
  assert.equal(command.calls.length, 1);
  assert.equal(command.calls[0].apiKey, "new-key");
  await command.complete();
  assert.deepEqual(fs.readFileSync(command.output), png);
  assert.equal(command.toasts[0].style, "success");
});

test("a file created during generation is preserved and reports a save error", async (t) => {
  const command = mockCommand(t);
  command.submit();
  fs.writeFileSync(command.output, "existing image");
  await command.complete();
  assert.equal(fs.readFileSync(command.output, "utf8"), "existing image");
  assert.deepEqual(command.toasts, [{ style: "failure", message: "Output file already exists" }]);
});

test("a failed preflight releases the submit guard so the user can try again", async (t) => {
  const command = mockCommand(t);
  fs.writeFileSync(command.output, "existing image");
  command.submit();
  await new Promise(setImmediate);
  assert.equal(command.calls.length, 0);
  fs.unlinkSync(command.output);
  command.submit();
  assert.equal(command.calls.length, 1);
  await command.complete();
});
