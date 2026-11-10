const { test } = require("node:test");
const assert = require("node:assert/strict");
const { repositoryMetadata, displayMarkdown, repositoryDisplayMarkdown } = require("../.test-dist/markdown");
const { repositoryMatchesQuery, partitionTitleMatches } = require("../.test-dist/search");

// Removing metadata extraction, bounds or scalar validation must break these tests.
test("repository metadata uses typed YAML strings and preserves original Markdown", () => {
  const source =
    '\uFEFF---\r\ntitle: "  Jinja 日本語  "\r\ndescription: >-\r\n  Template syntax\r\n  and examples\r\ntags: [" Python ", programming, python, "", 42, { bad: value }]\r\ncategory: ignored\r\n---\r\n# Existing heading\r\n<T> 😀\r\n';
  assert.deepEqual(repositoryMetadata(source), {
    title: "Jinja 日本語",
    description: "Template syntax and examples",
    tags: ["Python", "programming"],
  });
  assert.equal(displayMarkdown(source), "# Existing heading\r\n<T> 😀\r\n");
  assert.ok(source.startsWith("\uFEFF---\r\n"));
});

for (const [label, source] of [
  ["absent", "# Heading\nBody"],
  ["unclosed", "---\ntitle: Title\n# Heading"],
  ["malformed", "---\ntitle: [broken\n---\n# Heading"],
  ["duplicate", "---\ntitle: A\ntitle: B\n---\nBody"],
  ["sequence root", "---\n- title: A\n---\nBody"],
  ["empty", "---\n---\nBody"],
  ["later", "Intro\n---\ntitle: A\n---\nBody"],
  ["fenced", "```yaml\n---\ntitle: A\n---\n```"],
  ["unknown tag", "---\ntitle: !custom A\n---\nBody"],
  ["oversized", `---\ntitle: A\nignored: ${"x".repeat(65536)}\n---\nBody`],
  ["unexpected types", "---\ntitle: 42\ndescription: true\ntags: scalar\n---\nBody"],
  ["null and collections", "---\ntitle: null\ndescription: [bad]\ntags: { bad: value }\n---\nBody"],
  ["blank", '---\ntitle: "  "\ndescription: ""\ntags: [" ", false, null]\n---\nBody'],
])
  test(`repository metadata safely ignores ${label}`, () => assert.deepEqual(repositoryMetadata(source), {}));

test("invalid fields do not discard independent valid metadata", () => {
  assert.deepEqual(repositoryMetadata('---\ntitle: [bad]\ndescription: "Useful reference"\ntags: [valid]\n---\n'), {
    description: "Useful reference",
    tags: ["valid"],
  });
});

test("aliases and recursive YAML are never expanded into metadata", () => {
  assert.deepEqual(repositoryMetadata("---\ntitle: &a [*a]\ndescription: *a\ntags: [*a, valid]\n---\nBody"), {
    tags: ["valid"],
  });
  assert.deepEqual(repositoryMetadata("---\nbase: &a Title\ntitle: *a\ntags: &b [*b]\n---\nBody"), {});
});

test("oversized fields and tag collections are ignored rather than truncated", () => {
  assert.deepEqual(
    repositoryMetadata(
      `---\ntitle: ${"x".repeat(201)}\ndescription: ${"x".repeat(1001)}\ntags: [${"x".repeat(65)}, valid]\n---\n`,
    ),
    { tags: ["valid"] },
  );
  assert.deepEqual(
    repositoryMetadata(`---\ntags: [${Array.from({ length: 21 }, (_, i) => `tag${i}`).join(", ")}]\n---\n`),
    {},
  );
  const result = repositoryMetadata(
    `---\ntitle: ${"x".repeat(200)}\ndescription: ${"d".repeat(1000)}\ntags: [${"t".repeat(64)}]\n---\n`,
  );
  assert.equal(result.title.length, 200);
  assert.equal(result.description.length, 1000);
  assert.equal(result.tags[0].length, 64);
});

test("repository search matches normalised metadata and retains path, source and repository search", () => {
  const sheet = {
    id: "sheet",
    type: "repository",
    title: "Jinja",
    description: "Template syntax and examples",
    tags: ["Web templates"],
    filePath: "docs/jinja.md",
    content: "Literal body",
  };
  for (const query of ["jinja", "SYNTAX AND", "web templates", "docs/", "literal", "example/notes"])
    assert.equal(repositoryMatchesQuery(sheet, query, "example/notes"), true, query);
  assert.equal(repositoryMatchesQuery(sheet, "missing", "example/notes"), false);
  const olderSheet = { ...sheet, tags: undefined, description: undefined };
  assert.equal(repositoryMatchesQuery(olderSheet, "literal"), true);
  assert.deepEqual(partitionTitleMatches([sheet], "jinja").titles, [sheet]);
  assert.deepEqual(partitionTitleMatches([sheet], "syntax").content, [sheet]);
});

// Without the wrapped description, native metadata labels hide most of long text.
test("repository details expose complete descriptions without interpreting metadata as Markdown", () => {
  const source = "---\ntitle: Example\n---\n# Body\n\n```sh\nprintf hello\n```\n";
  const description = "Readable 日本語 " + "long description ".repeat(50);
  assert.equal(repositoryDisplayMarkdown(source, description), description + "\n\n---\n\n" + displayMarkdown(source));
  assert.equal(repositoryDisplayMarkdown(source), displayMarkdown(source));
  assert.equal(repositoryDisplayMarkdown(source, ""), displayMarkdown(source));
  const markup = "![image](https://example.com/a) <b> **bold** `code` &amp;";
  const literal = String.raw`\!\[image\]\(https\:\/\/example\.com\/a\) \<b\> \*\*bold\*\* \`code\` \&amp\;`;
  assert.equal(repositoryDisplayMarkdown(source, markup), literal + "\n\n---\n\n" + displayMarkdown(source));
  assert.equal(source, "---\ntitle: Example\n---\n# Body\n\n```sh\nprintf hello\n```\n");
});
