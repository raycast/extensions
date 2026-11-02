import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import plist from "plist";
import { convertLibrary } from "../src/lib/converter";
import { exportSnippets, validateFilename } from "../src/lib/exporter";
import { findLocalSettings, parseCsvLibrary, parseLibrary, readLibrary } from "../src/lib/reader";

function snippet(overrides: Record<string, unknown> = {}) {
  return {
    uuidString: "one",
    label: "Greeting",
    abbreviation: ";hello",
    plainText: "Hello!",
    snippetType: 0,
    ...overrides,
  };
}

function groupData() {
  return { name: "Email", snippetPlists: [snippet()] };
}

for (const { source, group } of [
  { source: "legacy-settings.textexpander", group: "Legacy Examples" },
  { source: "group-export.textexpander", group: "Exported Examples" },
  { source: "Settings.textexpandersettings", group: "Bundle Examples" },
]) {
  test(`reads real TextExpander fixture: ${source}`, async () => {
    const library = await readLibrary(join(__dirname, "fixtures", source));
    assert.equal(library.suggestedCount, 0);
    assert.deepEqual(
      library.snippets.map((item) => item.group),
      [group, group],
    );
    assert.deepEqual(
      library.snippets.map((item) => item.kind),
      ["plain", "plain"],
    );
    assert.deepEqual(
      convertLibrary(library, true).snippets.map((item) => item.snippet),
      [
        { name: `[${group}] Greeting`, text: "Hello, world!\n", keyword: ";hello" },
        { name: `[${group}] ;sig`, text: "Best,\nExample", keyword: ";sig" },
      ],
    );
  });
}

test("legacy settings join snippets to groups and always exclude suggested snippets", () => {
  const library = parseLibrary({
    groupsTE2: [
      { name: "Email", snippetUUIDs: ["one", "secret"] },
      { name: " Suggested Snippets ", snippetUUIDs: ["secret"] },
    ],
    snippetsTE2: [
      snippet(),
      snippet({ uuidString: "secret", plainText: "do not export" }),
      snippet({ uuidString: "loose" }),
    ],
  });
  assert.equal(library.suggestedCount, 1);
  assert.deepEqual(
    library.snippets.map((item) => item.group),
    ["Email", "Ungrouped"],
  );
  assert.ok(!JSON.stringify(library).includes("do not export"));
});

test("group exports preserve labels, keywords, Unicode, spaces, and line breaks", () => {
  const text = '  Hello, 世界 👋\n"quoted" & <xml>\t ';
  const library = parseLibrary({ name: "Email", snippetPlists: [snippet({ plainText: text })] });
  assert.deepEqual(convertLibrary(library, true).snippets[0]?.snippet, {
    name: "[Email] Greeting",
    keyword: ";hello",
    text,
  });
});

test("suggested group exports are excluded before reading snippet content", () => {
  assert.deepEqual(parseLibrary({ name: "Suggested Snippets", snippetPlists: [{ plainText: 123 }] }), {
    snippets: [],
    suggestedCount: 1,
  });
  assert.deepEqual(
    parseLibrary({ groupInfo: { groupName: " Suggested Snippets " }, snippetsTE2: [{ plainText: 123 }] }),
    {
      snippets: [],
      suggestedCount: 1,
    },
  );
});

test("missing UUIDs receive stable independent preview IDs", () => {
  const library = parseLibrary({
    snippetsTE2: [snippet({ uuidString: undefined }), snippet({ uuidString: undefined, label: "Other" })],
  });
  assert.equal(new Set(convertLibrary(library, false).snippets.map((item) => item.id)).size, 2);
});

test("malformed and unrelated property lists fail instead of producing a partial import", () => {
  for (const data of [
    null,
    [],
    {},
    { snippetsTE2: "bad" },
    { snippetsTE2: [null] },
    { snippetsTE2: [snippet({ plainText: 123 })] },
    { groupsTE2: [{ snippetUUIDs: [7] }] },
    { snippetsTE2: [], groupInfo: null },
    { snippetsTE2: [], groupInfo: { groupName: 123 } },
  ]) {
    assert.throws(() => parseLibrary(data));
  }
});

test("empty valid libraries remain distinguishable from invalid files", () => {
  assert.deepEqual(parseLibrary({ snippetsTE2: [] }), { snippets: [], suggestedCount: 0 });
  assert.deepEqual(parseLibrary({ name: "Email", snippetPlists: [] }), { snippets: [], suggestedCount: 0 });
});

test("CSV reads reordered headers, UTF-8 BOM, multiline quoted fields, commas, and escaped quotes", () => {
  const library = parseCsvLibrary(
    '\uFEFFlabel,snippet,abbreviation\r\nGreeting,"Hello, \"\"world\"\"\n世界",;hello\r\n',
    "Email",
  );
  assert.deepEqual(convertLibrary(library, false).snippets[0]?.snippet, {
    name: "Greeting",
    text: 'Hello, "world"\n世界',
    keyword: ";hello",
  });
});

test("CSV also supports headerless two- and three-column TextExpander exports", () => {
  const two = convertLibrary(parseCsvLibrary(';hi,"Hello\nthere"\n', "Email"), false);
  assert.equal(two.snippets[0]?.snippet.name, ";hi");
  const three = convertLibrary(parseCsvLibrary(";hi,Hello,Greeting\n", "Email"), false);
  assert.equal(three.snippets[0]?.snippet.name, "Greeting");
  assert.equal(parseCsvLibrary("snippet,Hello\n", "Email").snippets[0]?.abbreviation, "snippet");
  assert.equal(parseCsvLibrary(";hi,snippet,Greeting\n", "Email").snippets[0]?.text, "snippet");
});

test("CSV excludes suggested groups and rejects malformed records", () => {
  assert.equal(parseCsvLibrary(";hi,Hello\n", "Suggested Snippets").suggestedCount, 1);
  assert.throws(() => parseCsvLibrary('abbreviation,snippet\n;hi,"unterminated', "Email"));
  assert.throws(() => parseCsvLibrary("just one field\n", "Email"));
  assert.throws(() => parseCsvLibrary("a,b,c,d\n", "Email"));
});

test("CSV rejects incomplete and repeated headers instead of misreading snippet content", () => {
  for (const csv of [
    "abbreviation,label\n;hi,Greeting\n",
    "snippet,label\nHello,Greeting\n",
    "abbreviation,snippet,snippet\n;hi,Hello,Lost text\n",
    "abbreviation,snippet,label,LABEL\n;hi,Hello,First,Second\n",
  ]) {
    assert.throws(() => parseCsvLibrary(csv, "Email"), /headers/i);
  }
});

test("whitespace-only snippet content survives conversion and JSON export", async () => {
  const text = " \t\n  ";
  const conversion = convertLibrary(
    parseLibrary({ name: "Spacing", snippetPlists: [snippet({ plainText: text })] }),
    false,
  );
  assert.equal(conversion.emptyCount, 0);
  const directory = await mkdtemp(join(tmpdir(), "textexpander-whitespace-"));
  try {
    const file = await exportSnippets({
      directory,
      filename: "spacing.json",
      snippets: conversion.snippets.map((item) => item.snippet),
    });
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")), [{ name: "Greeting", text, keyword: ";hello" }]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("keywords unsupported by Raycast are preserved with a review warning", () => {
  const keywords = ["two words", "it's", 'a"b', "a`b", "a\tb", "it\u2019s", "\u201chello\u201d"];
  const conversion = convertLibrary(
    parseLibrary({
      name: "Keywords",
      snippetPlists: [...keywords, ";valid"].map((abbreviation) => snippet({ abbreviation })),
    }),
    false,
  );
  assert.deepEqual(
    conversion.snippets.map((item) => item.snippet.keyword),
    [...keywords, ";valid"],
  );
  assert.ok(
    conversion.snippets.slice(0, -1).every((item) => item.warnings.some((warning) => warning.includes("cannot use"))),
  );
  assert.deepEqual(conversion.snippets.at(-1)?.warnings, []);
});

test("conversion removes exact duplicates and empty text but retains conflicting keywords for review", () => {
  const library = parseLibrary({
    name: "Email",
    snippetPlists: [
      snippet(),
      snippet(),
      snippet({ uuidString: "two", label: "Other", plainText: "Other" }),
      snippet({ plainText: "" }),
    ],
  });
  const result = convertLibrary(library, true);
  assert.equal(result.duplicateCount, 1);
  assert.equal(result.emptyCount, 1);
  assert.equal(result.snippets.length, 2);
  assert.ok(result.snippets.every((item) => item.warnings.some((warning) => warning.includes("same keyword"))));
});

test("name fallback and optional group prefixes do not invent keywords", () => {
  const result = convertLibrary(
    parseLibrary({
      name: "Email",
      snippetPlists: [snippet({ label: "", abbreviation: "" }), snippet({ label: "", abbreviation: ";hi" })],
    }),
    false,
  );
  assert.deepEqual(result.snippets[0]?.snippet, { name: "Untitled", text: "Hello!" });
  assert.equal(result.snippets[1]?.snippet.name, ";hi");
  assert.equal(result.snippets[0]?.warnings.length, 1);
});

test("rich text, scripts, unknown types, and macros retain source text with explicit review notes", () => {
  const library = parseLibrary({
    name: "Email",
    snippetPlists: [
      snippet({ snippetType: 1 }),
      snippet({ snippetType: 2, label: "AppleScript", plainText: 'display dialog "Hello"' }),
      snippet({ snippetType: 3, label: "Shell", plainText: "echo Hello" }),
      snippet({ snippetType: 99, label: "Unknown" }),
      snippet({ label: "Macros", abbreviation: ";macros", plainText: "%filltext:name=Name% %clipboard %| %Y {date}" }),
    ],
  });
  const result = convertLibrary(library, false);
  assert.deepEqual(
    result.snippets.map((item) => item.kind),
    ["rich", "applescript", "shell", "unknown", "plain"],
  );
  assert.ok(result.snippets.every((item) => item.warnings.length > 0));
  assert.equal(result.snippets[4]?.snippet.text, "%filltext:name=Name% %clipboard %| %Y {date}");
  assert.equal(result.snippets[4]?.warnings.length, 2);
});

test("image-only snippets count as empty instead of exporting binary rich text", () => {
  const result = convertLibrary(
    parseLibrary({
      name: "Images",
      snippetPlists: [snippet({ plainText: undefined, snippetType: 1, richText: Buffer.from("image") })],
    }),
    true,
  );
  assert.equal(result.emptyCount, 1);
  assert.deepEqual(result.snippets, []);
});

test("filenames cannot escape the chosen folder", () => {
  for (const filename of [
    "",
    "../snippets.json",
    "/tmp/snippets.json",
    "folder/file.json",
    "folder\\file.json",
    "file.txt",
    "bad\0.json",
    "bad:name.json",
  ]) {
    assert.ok(validateFilename(filename), filename);
  }
  assert.equal(validateFilename("my snippets.json"), undefined);
});

test("export writes exact Raycast JSON, keeps permissions private, and never overwrites", async () => {
  const directory = await mkdtemp(join(tmpdir(), "textexpander-export-"));
  try {
    const snippets = [
      { name: "Greeting", text: "Hello\n世界", keyword: ";hi" },
      { name: "No keyword", text: "Just text" },
    ];
    const file = await exportSnippets({ directory, filename: "snippets.json", snippets });
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")), snippets);
    assert.equal((await stat(file)).mode & 0o777, 0o600);
    await assert.rejects(
      exportSnippets({ directory, filename: "snippets.json", snippets: [{ name: "Wrong", text: "overwrite" }] }),
      { code: "EEXIST" },
    );
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")), snippets);
    await assert.rejects(exportSnippets({ directory, filename: "empty.json", snippets: [] }), /at least one/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a failed write removes the partial export and allows retrying the same filename", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "textexpander-failed-export-"));
  const filePath = join(directory, "snippets.json");
  const snippets = [{ name: "Greeting", text: "Hello!", keyword: ";hello" }];
  const failure = Object.assign(new Error("No space left on device"), { code: "ENOSPC" });
  const realWrite = fs.writeFile;
  t.mock.method(
    fs,
    "writeFile",
    async (...args: Parameters<typeof fs.writeFile>) => {
      await realWrite(args[0], "[", args[2]);
      throw failure;
    },
    { times: 1 },
  );
  try {
    await assert.rejects(exportSnippets({ directory, filename: "snippets.json", snippets }), failure);
    await assert.rejects(stat(filePath), { code: "ENOENT" });
    const retry = await exportSnippets({ directory, filename: "snippets.json", snippets });
    assert.deepEqual(JSON.parse(await readFile(retry, "utf8")), snippets);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("XML and binary plists produce the same conversion through the real reader", async () => {
  const directory = await mkdtemp(join(tmpdir(), "textexpander-plist-"));
  try {
    const xml = join(directory, 'source "quotes" & spaces.textexpander');
    const binary = join(directory, "binary.textexpander");
    await writeFile(xml, plist.build({ ...groupData(), date: new Date(), richText: Buffer.from("binary metadata") }));
    execFileSync("/usr/bin/plutil", ["-convert", "binary1", "-o", binary, "--", xml]);
    assert.equal((await readFile(binary)).subarray(0, 8).toString(), "bplist00");
    const expected = convertLibrary(parseLibrary(groupData()), true);
    assert.deepEqual(convertLibrary(await readLibrary(xml), true), expected);
    assert.deepEqual(convertLibrary(await readLibrary(binary), true), expected);
    const invalid = join(directory, "bad.textexpander");
    await writeFile(invalid, "this is not a plist");
    await assert.rejects(readLibrary(invalid), /Could not read/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("settings bundles combine group XMLs and exclude suggested data", async () => {
  const directory = await mkdtemp(join(tmpdir(), "textexpander-bundle-"));
  try {
    await writeFile(join(directory, "group_email.xml"), plist.build(groupData()));
    await writeFile(
      join(directory, "group_suggested.xml"),
      plist.build({ name: "Suggested Snippets", snippetPlists: [snippet()] }),
    );
    await writeFile(join(directory, "unrelated.xml"), "ignored");
    const result = await readLibrary(directory);
    assert.equal(result.snippets.length, 1);
    assert.equal(result.suggestedCount, 1);
    await writeFile(join(directory, "group_broken.xml"), "not XML");
    await assert.rejects(readLibrary(directory));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("file reader detects CSV and derives the group from its filename", async () => {
  const directory = await mkdtemp(join(tmpdir(), "textexpander-csv-"));
  try {
    const file = join(directory, "Email.CSV");
    await writeFile(file, "abbreviation,snippet,label\n;hi,Hello,Greeting\n");
    assert.equal((await readLibrary(file)).snippets[0]?.group, "Email");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("auto-detection prefers a settings bundle, falls back to legacy, and explains missing settings", async () => {
  const home = await mkdtemp(join(tmpdir(), "textexpander-home-"));
  try {
    await assert.rejects(findLocalSettings(home), /No local TextExpander settings/);
    const directory = join(home, "Library", "Application Support", "TextExpander");
    await mkdir(directory, { recursive: true });
    const legacy = join(directory, "Settings.textexpander");
    await writeFile(legacy, plist.build(groupData()));
    assert.equal(await findLocalSettings(home), legacy);
    const bundle = join(directory, "Settings.textexpandersettings");
    await mkdir(bundle);
    assert.equal(await findLocalSettings(home), bundle);
    await assert.rejects(readLibrary(bundle), /no group XML/);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
