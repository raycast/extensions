const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const folder = fs.mkdtempSync(path.join(os.tmpdir(), "cheatsheets-import-"));
after(() => fs.rmSync(folder, { recursive: true, force: true }));
const read = (...args) => require("../.test-dist/local-markdown").readLocalMarkdown(...args);
function file(name, content) {
  const location = path.join(folder, name);
  fs.writeFileSync(location, content);
  return location;
}

test("local import preserves Unicode BOM CRLF and original metadata source", async () => {
  const content =
    '\uFEFF---\r\ntitle: 日本語 😀\r\ndescription: "  Quick   reference "\r\ntags: [Git, git, CLI]\r\n---\r\n# Body\r\n```sh\r\ngit status  \r\n```\r\n';
  const location = file("notes.MD", content);
  assert.deepEqual(await read(location), {
    title: "日本語 😀",
    description: "Quick reference",
    tags: ["Git", "CLI"],
    content,
  });
  assert.equal(fs.readFileSync(location, "utf8"), content);
});
for (const [label, content] of [
  ["absent", "# A heading is not the filename\n"],
  ["malformed", "---\ntitle: [broken\n---\nBody"],
  ["unsupported", "---\ntitle: true\ntags: invalid\n---\nBody"],
  ["oversized", `---\ntitle: ${"x".repeat(201)}\n---\nBody`],
])
  test(`local import uses filename for ${label} metadata`, async () => {
    const result = await read(file(`${label}.md`, content));
    assert.equal(result.title, label);
    assert.equal(result.content, content);
    assert.equal(result.tags, undefined);
  });
for (const name of ["README.md", "_private.md", "notes@2.md", ".md"]) {
  test(`explicitly selected ${name} is importable`, async () => {
    const result = await read(file(name, "# Notes"));
    assert.ok(result.title.trim());
    assert.equal(result.content, "# Notes");
  });
}
for (const [label, bytes] of [
  ["empty", Buffer.alloc(0)],
  ["whitespace", Buffer.from("\uFEFF \r\n\t")],
  ["binary", Buffer.from("# Heading\0Binary")],
  ["control", Buffer.from([1, 2, 3])],
  ["invalid UTF-8", Buffer.from([0xc3, 0x28])],
  ["UTF-16", Buffer.from([0xff, 0xfe, 65, 0])],
  ["oversized", Buffer.alloc(1024 * 1024 + 1, 65)],
])
  test(`local import rejects ${label} input`, async () => {
    await assert.rejects(read(file(`${label}.md`, bytes)), /empty|UTF-8|text|1 MiB/i);
  });
test("local import allows exactly 1 MiB", async () => {
  const content = "a".repeat(1024 * 1024);
  assert.equal((await read(file("boundary.md", content))).content, content);
});
test("local import rejects missing files directories and other extensions", async () => {
  await assert.rejects(read(path.join(folder, "missing.md")), /read|available/i);
  const directory = path.join(folder, "directory.md");
  fs.mkdirSync(directory);
  await assert.rejects(read(directory), /regular file/i);
  await assert.rejects(read(file("notes.txt", "# Notes")), /\.md/);
});
test("local import cancellation never returns a staged copy", async () => {
  const location = file("cancel.md", "# Notes");
  const cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(read(location, cancelled.signal), { name: "AbortError" });
  const during = new AbortController();
  const loading = read(location, during.signal);
  during.abort();
  await assert.rejects(loading, { name: "AbortError" });
});

test("local import bounds the actual read when a file grows after stat", async () => {
  const location = file("growing.md", "# Initial\n");
  const promises = require("node:fs/promises");
  const originalOpen = promises.open;
  promises.open = async (...args) => {
    const handle = await originalOpen(...args);
    const stat = handle.stat.bind(handle);
    handle.stat = async () => {
      const info = await stat();
      fs.appendFileSync(location, Buffer.alloc(1024 * 1024, 65));
      return info;
    };
    return handle;
  };
  try {
    await assert.rejects(read(location), /1 MiB/);
  } finally {
    promises.open = originalOpen;
  }
});
