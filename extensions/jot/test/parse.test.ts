import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addJotTakesImages,
  allTags,
  idFromToolReply,
  parseShortcut,
  sectionsOf,
  shortcutScript,
  groupJots,
  parseCliError,
  parseMcpList,
  parseRows,
  parseTags,
  sectionFor,
  stripFrontmatter,
  tagHue,
} from "../src/lib/parse.ts";

const ROWS = [
  "6zyc6x\topen\tBuy milk #x #groceries #home\t/v/2026-11-14-6zyc6x.md",
  "lhm7ux\tdone\tHello world second line\t/v/2026-11-14-lhm7ux.md",
].join("\n");

test("parseRows reads id, status, title, trailing tags, and path", () => {
  assert.deepEqual(parseRows(ROWS), [
    {
      id: "6zyc6x",
      status: "open",
      title: "Buy milk",
      tags: ["x", "groceries", "home"],
      created: "",
      path: "/v/2026-11-14-6zyc6x.md",
      preview: "",
      section: "",
      pinned: false,
    },
    {
      id: "lhm7ux",
      status: "done",
      title: "Hello world second line",
      tags: [],
      created: "",
      path: "/v/2026-11-14-lhm7ux.md",
      preview: "",
      section: "",
      pinned: false,
    },
  ]);
});

test("parseRows treats 'No jots.' and junk as empty", () => {
  assert.deepEqual(parseRows("No jots."), []);
  assert.deepEqual(parseRows(""), []);
  assert.deepEqual(parseRows("a\tb"), []);
});

test("parseRows keeps a tab inside the title", () => {
  assert.equal(parseRows("abc123\topen\tA\tB #t\t/p.md")[0].title, "A\tB");
});

function reply(id: number, result: unknown) {
  return JSON.stringify({ jsonrpc: "2.0", id, result });
}

test("parseMcpList prefers structuredContent and takes paths from the text rows", () => {
  const out = [
    reply(1, { protocolVersion: "2025-06-18" }),
    reply(2, {
      content: [{ type: "text", text: ROWS }],
      structuredContent: {
        kind: "list",
        jots: [
          {
            id: "6zyc6x",
            status: "open",
            title: "Buy milk #x",
            tags: ["groceries", "home"],
            created: "2026-11-14T00:24:59.908Z",
            preview: "more",
            section: "",
            pinned: false,
          },
          {
            id: "lhm7ux",
            status: "done",
            title: "Hello world second line",
            tags: [],
            created: "2026-11-14T00:24:59.880Z",
            preview: "",
            section: "",
            pinned: false,
          },
        ],
      },
    }),
  ].join("\n");
  const jots = parseMcpList(out, 2);
  assert.equal(jots.length, 2);
  assert.deepEqual(jots[0], {
    id: "6zyc6x",
    status: "open",
    title: "Buy milk #x",
    tags: ["groceries", "home"],
    created: "2026-11-14T00:24:59.908Z",
    path: "/v/2026-11-14-6zyc6x.md",
    preview: "more",
    section: "",
    pinned: false,
  });
  assert.equal(jots[1].status, "done");
});

test("parseMcpList falls back to the text rows without structuredContent", () => {
  const jots = parseMcpList(reply(2, { content: [{ type: "text", text: ROWS }] }), 2);
  assert.deepEqual(
    jots.map((j) => j.id),
    ["6zyc6x", "lhm7ux"],
  );
});

test("parseMcpList throws tool and protocol errors", () => {
  assert.throws(
    () => parseMcpList(reply(2, { isError: true, content: [{ type: "text", text: "no vault at /x" }] }), 2),
    /no vault at \/x/,
  );
  assert.throws(
    () =>
      parseMcpList(JSON.stringify({ jsonrpc: "2.0", id: 2, error: { code: -32601, message: "Method not found" } }), 2),
    /Method not found/,
  );
  assert.throws(() => parseMcpList("not json\n", 2), /no answer/);
});

test("parseCliError reads the JSON error and plain text", () => {
  const json = JSON.stringify(
    { ok: false, error: { kind: "command-execution", message: "no jot zzzzzz", command: "done" } },
    null,
    2,
  );
  assert.equal(parseCliError(json), "no jot zzzzzz");
  assert.equal(parseCliError("Error: no vault at /x\n"), "no vault at /x");
  assert.equal(parseCliError(""), "");
});

test("stripFrontmatter removes only the leading YAML block", () => {
  assert.equal(stripFrontmatter("---\nid: a\ntags: []\n---\n# Title\nbody\n---\nmore"), "# Title\nbody\n---\nmore");
  assert.equal(stripFrontmatter("\uFEFF---\r\nid: a\r\n---\r\nhi"), "hi");
  assert.equal(stripFrontmatter("no front matter"), "no front matter");
  assert.equal(stripFrontmatter("---\nid: a\n---"), "");
});

test("parseTags splits, cleans, and dedupes", () => {
  assert.deepEqual(parseTags(" #idea, work  idea,,--x #"), ["idea", "work", "x"]);
  assert.deepEqual(parseTags(""), []);
});

test("sectionFor buckets by local day", () => {
  const now = new Date(2026, 10, 14, 10, 0);
  assert.equal(sectionFor(new Date(2026, 10, 14, 0, 5).toISOString(), now), "Today");
  assert.equal(sectionFor(new Date(2026, 10, 13, 23, 59).toISOString(), now), "Yesterday");
  assert.equal(sectionFor(new Date(2026, 10, 9).toISOString(), now), "This Week");
  assert.equal(sectionFor(new Date(2026, 10, 1).toISOString(), now), "Earlier");
  assert.equal(sectionFor("", now), "Undated");
  assert.equal(sectionFor("nope", now), "Undated");
});

test("groupJots keeps order and drops empty groups; tags sort by use", () => {
  const now = new Date(2026, 10, 14, 10, 0);
  const j = (id: string, created: string, tags: string[] = []) => ({
    id,
    status: "open" as const,
    title: id,
    tags,
    created,
    path: "",
    preview: "",
    section: "",
    pinned: false,
  });
  const jots = [
    j("a", new Date(2026, 10, 14).toISOString(), ["work"]),
    j("b", new Date(2026, 9, 1).toISOString(), ["idea", "work"]),
    j("c", new Date(2026, 10, 14, 1).toISOString()),
  ];
  assert.deepEqual(
    groupJots(jots, now).map((g) => [g.section, g.jots.map((x) => x.id)]),
    [
      ["Today", ["a", "c"]],
      ["Earlier", ["b"]],
    ],
  );
  assert.deepEqual(allTags(jots), ["work", "idea"]);
  assert.equal(tagHue("Work", 7), tagHue("work", 7));
});

test("shortcuts from Jot settings become AppleScript keystrokes", () => {
  assert.equal(
    shortcutScript(parseShortcut(["Control+Option+V"])),
    'tell application "System Events" to keystroke "v" using {control down, option down}',
  );
  assert.match(shortcutScript(parseShortcut(["Shift", "Shift"]))!, /key down shift[\s\S]*key down shift/);
  assert.equal(parseShortcut([]).kind, "none");
  assert.equal(shortcutScript(parseShortcut(["Control+F13"])), null);
  assert.equal(parseShortcut(["Hyper+V"]).kind, "none");
});

test("add_jot replies, image support, and sections", () => {
  const reply = (id: number, result: unknown) => JSON.stringify({ jsonrpc: "2.0", id, result });
  assert.equal(
    idFromToolReply(reply(2, { content: [{ type: "text", text: "abc123\topen\tHi\t/v/a.md" }] }), 2),
    "abc123",
  );
  assert.throws(() => idFromToolReply(reply(2, { isError: true, content: [{ text: "bad image" }] }), 2), /bad image/);
  const tools = (props: object) => reply(5, { tools: [{ name: "add_jot", inputSchema: { properties: props } }] });
  assert.equal(addJotTakesImages(tools({ text: {}, images: {} }), 5), true);
  assert.equal(addJotTakesImages(tools({ text: {} }), 5), false);
  const j = (section: string) => ({
    id: section,
    status: "open" as const,
    title: "",
    tags: [],
    created: "",
    path: "",
    preview: "",
    section,
    pinned: false,
  });
  assert.deepEqual(sectionsOf([j("Work"), j(""), j("Ideas"), j("Work")]), ["Ideas", "Work"]);
});
