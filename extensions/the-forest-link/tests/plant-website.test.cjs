const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const requests = [];
let statusCode = 200;
let formOptions;
let lastToast;
const api = {
  Action: { SubmitForm: "SubmitForm" },
  ActionPanel: "ActionPanel",
  Form: Object.assign(() => {}, { Description: "Description", TextField: "TextField" }),
  Icon: {},
  Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
  showToast: async (options) => (lastToast = { ...options }),
};
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: file,
  });
  const localRequire = (id) => {
    if (id === "node:https") {
      return {
        request(url, options) {
          const req = new EventEmitter();
          const recorded = { url, options };
          requests.push(recorded);
          req.destroy = (error) => req.emit("error", error);
          req.end = (body) => {
            recorded.body = body;
            setImmediate(() => req.emit("response", { statusCode, statusMessage: "Fixture", destroy() {} }));
          };
          return req;
        },
      };
    }
    if (id === "@raycast/api") return api;
    if (id === "@raycast/utils") {
      return {
        useForm(options) {
          formOptions = options;
          return { handleSubmit: options.onSubmit, itemProps: { website: {} } };
        },
      };
    }
    if (!id.startsWith(".")) return require(id);
    const base = path.resolve(path.dirname(file), id);
    return load([`${base}.ts`, `${base}.tsx`].find(fs.existsSync));
  };
  new Function("require", "module", "exports", outputText)(localRequire, mod, mod.exports);
  return mod.exports;
}

const { normalizeWebsiteUrl, plantWebsite } = load(path.join(root, "src/the-forest.ts"));
const { default: Command } = load(path.join(root, "src/plant-a-website.tsx"));
const { default: plant, confirmation } = load(path.join(root, "src/tools/plant-website.ts"));

const valid = [
  ["example.com", "https://example.com/"],
  ["  example.com  ", "https://example.com/"],
  ["\n\texample.com\r\n", "https://example.com/"],
  ["EXAMPLE.COM/blog?q=one#two", "https://example.com/blog?q=one#two"],
  ["example.com:8443/blog", "https://example.com:8443/blog"],
  ["example.com:443", "https://example.com/"],
  ["https://example.com", "https://example.com/"],
  ["https://example.com:8443/blog?x=1&y=2#section", "https://example.com:8443/blog?x=1&y=2#section"],
  ["http://example.com:8080/blog", "http://example.com:8080/blog"],
  ["HTTP://EXAMPLE.COM:80", "http://example.com/"],
  ["localhost", "https://localhost/"],
  ["localhost:3000/path", "https://localhost:3000/path"],
  ["127.0.0.1:8080/path", "https://127.0.0.1:8080/path"],
  ["[::1]:8080/path", "https://[::1]:8080/path"],
  ["http://[::1]:8080/path", "http://[::1]:8080/path"],
  ["bücher.de/path", "https://xn--bcher-kva.de/path"],
  ["bücher.de:8443/path", "https://xn--bcher-kva.de:8443/path"],
  ["example.com/a%20b", "https://example.com/a%20b"],
];
for (const [input, expected] of valid) {
  test(`normalize ${JSON.stringify(input)}`, () => {
    assert.equal(normalizeWebsiteUrl(input), expected);
    assert.equal(normalizeWebsiteUrl(expected), expected);
  });
}

const invalid = [
  "",
  "   ",
  "not a website",
  "example .com",
  "example.com/a b",
  "exam\nple.com",
  "example.com\u0000",
  "example",
  "-example.com",
  "example-.com",
  "example..com",
  "example_.com",
  ".com",
  "https://",
  "http:/example.com",
  "https:example.com",
  "https:///example.com",
  "//example.com",
  "/path",
  "example.com:abc",
  "example.com:",
  "https://example.com:",
  "example.com:65536",
  "https://example.com:65536",
  "[invalid]:8080",
  "https://user:secret@example.com",
  "https://@example.com",
  "user@example.com",
  "https://example.com\\evil",
  "javascript:alert(1)",
  "data:text/html,hello",
  "file:///tmp/test",
  "ftp://example.com",
  "mailto:you@example.com",
  "JaVaScRiPt:123",
  "https://?example.com",
  `${"a".repeat(64)}.com`,
];
for (const input of invalid) {
  test(`reject ${JSON.stringify(input)}`, () => assert.throws(() => normalizeWebsiteUrl(input)));
}

test("form validates bare domains and submits the canonical HTTPS URL through mocked HTTPS", async () => {
  requests.length = 0;
  const form = Command();
  assert.match(form.props.children[1].props.info, /Bare domains use HTTPS/);
  assert.equal(formOptions.validation.website(undefined), "Enter a website address");
  assert.equal(formOptions.validation.website("example.com"), undefined);
  assert.equal(formOptions.validation.website("https://example.com"), undefined);
  assert.match(formOptions.validation.website("javascript:alert(1)"), /domain or a valid HTTP or HTTPS/);
  await formOptions.onSubmit({ website: " example.com/blog?x=1&y=2 " });
  assert.equal(requests.length, 1);
  const [{ url, options, body }] = requests;
  assert.equal(url, "https://theforest.link/api/submit/index.php");
  assert.equal(options.method, "POST");
  assert.equal(options.headers["Content-Type"], "application/x-www-form-urlencoded");
  assert.equal(options.headers["Content-Length"], Buffer.byteLength(body));
  assert.equal(new URLSearchParams(body).get("website"), "https://example.com/blog?x=1&y=2");
  assert.equal(lastToast.style, "success");
});

test("invalid form submission cannot reach the mocked planting transport", async () => {
  requests.length = 0;
  Command();
  await formOptions.onSubmit({ website: "file:///tmp/test" });
  assert.equal(requests.length, 0);
  assert.equal(lastToast.style, "failure");
});

test("AI confirmation and submission use the same normalized URL", async () => {
  requests.length = 0;
  const input = { website: "example.com:8443/blog" };
  const preview = await confirmation(input);
  assert.equal(preview.info[0].value, "https://example.com:8443/blog");
  assert.equal(requests.length, 0);
  const result = await plant(input);
  assert.equal(result.website, preview.info[0].value);
  assert.equal(result.submitted, true);
  assert.equal(new URLSearchParams(requests[0].body).get("website"), result.website);
});

test("AI confirmation and submission reject unsafe addresses before transport", async () => {
  requests.length = 0;
  await assert.rejects(confirmation({ website: "javascript:alert(1)" }));
  await assert.rejects(plant({ website: "javascript:alert(1)" }));
  assert.equal(requests.length, 0);
});

test("planting surfaces mocked HTTP failure without any real requests", async () => {
  statusCode = 400;
  try {
    await assert.rejects(plantWebsite("https://example.com/"), /The Forest returned 400 Fixture/);
  } finally {
    statusCode = 200;
  }
});

test("hostname length excludes the optional trailing root dot", () => {
  const longestHost = ["a".repeat(63), "b".repeat(63), "c".repeat(63), "d".repeat(61)].join(".");
  const overlongHost = `${longestHost}d`;
  assert.equal(longestHost.length, 253);
  for (const scheme of ["", "http://", "https://"]) {
    for (const suffix of ["", "."]) {
      const input = `${scheme}${longestHost}${suffix}/blog`;
      assert.equal(normalizeWebsiteUrl(input), `${scheme || "https://"}${longestHost}${suffix}/blog`);
      assert.throws(() => normalizeWebsiteUrl(`${scheme}${overlongHost}${suffix}/blog`));
    }
  }
});
