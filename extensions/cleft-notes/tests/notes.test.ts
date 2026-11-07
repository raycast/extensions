import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  MAX_FILE_BYTES,
  parseNote,
  readLibrary,
  resolveSyncFolder,
  searchNotes,
} from "../src/lib/notes.ts";

const sample = (
  id = 42,
  title = "Planning: café",
  created = "2026-10-09T20:00:00Z",
) =>
  `---\ncleft_id: ${id}\ntitle: ${JSON.stringify(title)}\ntags: ["work", "ideas"]\ncreated: ${created}\nupdated: 2026-10-10T00:00:00Z\nsource: cleft\ntranscript: "A spoken detail about the zebra project\\nSecond line"\n---\n\n# Summary\nDiscuss the team’s priorities.\n`;

test("documented Local Sync frontmatter preserves quoted titles, UTC dates, transcript and summary", () => {
  const note = parseNote(sample(), "/exports/note.md", new Date(0));
  assert.ok(note);
  assert.equal(note.id, "42");
  assert.equal(note.title, "Planning: café");
  assert.equal(note.created.toISOString(), "2026-10-09T20:00:00.000Z");
  assert.equal(
    note.transcript,
    "A spoken detail about the zebra project\nSecond line",
  );
  assert.ok(note.summary.startsWith("# Summary"));
});

test("foreign markdown, malformed YAML and invalid Cleft identifiers never become search results", () => {
  assert.equal(
    parseNote("# ordinary note", "/exports/a.md", new Date(0)),
    undefined,
  );
  assert.equal(
    parseNote(
      sample().replace("source: cleft", "source: another-app"),
      "/exports/a.md",
      new Date(0),
    ),
    undefined,
  );
  assert.equal(
    parseNote(
      sample().replace("cleft_id: 42", "cleft_id: /secret"),
      "/exports/a.md",
      new Date(0),
    ),
    undefined,
  );
  assert.equal(
    parseNote(
      sample().replace('tags: ["work", "ideas"]', "tags: ["),
      "/exports/a.md",
      new Date(0),
    ),
    undefined,
  );
});

test("search includes transcript-only text, tags and accent-insensitive multiword matching", () => {
  const note = parseNote(sample(), "/exports/note.md", new Date(0))!;
  assert.equal(searchNotes([note], "CAFE zebra", "work").length, 1);
  assert.equal(searchNotes([note], "priorities ideas").length, 1);
  assert.equal(searchNotes([note], "zebra", "personal").length, 0);
  assert.equal(searchNotes([note], "missing").length, 0);
});

test("file integration finds Cleft exports recursively, orders latest creation first, attaches audio and excludes symlinks and oversized files", async () => {
  const root = await mkdtemp(
    join(process.env.CLEFT_TEST_TEMP || tmpdir(), "cleft-test-"),
  );
  try {
    const exports = join(root, "exports");
    await mkdir(join(exports, "nested"), { recursive: true });
    await writeFile(join(exports, "old.md"), sample(1));
    await writeFile(
      join(exports, "nested", "latest.md"),
      sample(2, "Latest", "2026-10-10T10:00:00Z"),
    );
    await writeFile(
      join(exports, "nested", "latest.m4a"),
      "disposable audio placeholder",
    );
    await writeFile(join(exports, "foreign.md"), "# Foreign markdown");
    await writeFile(
      join(exports, "oversized.md"),
      Buffer.alloc(MAX_FILE_BYTES + 1),
    );
    await writeFile(join(root, "outside.md"), sample(99));
    await symlink(join(root, "outside.md"), join(exports, "linked.md"));
    const result = await readLibrary(exports);
    const canonicalExports = await realpath(exports);
    assert.equal(result.folder, canonicalExports);
    assert.deepEqual(
      result.notes.map((note) => note.id),
      ["2", "1"],
    );
    assert.equal(
      result.notes[0].audioPath,
      join(canonicalExports, "nested", "latest.m4a"),
    );
    assert.equal(result.skipped, 1);
    assert.equal(result.limited, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a missing export folder produces a failure instead of empty success", async () => {
  await assert.rejects(
    readLibrary(
      join(
        process.env.CLEFT_TEST_TEMP || tmpdir(),
        "cleft-folder-that-does-not-exist",
      ),
    ),
    { code: "ENOENT" },
  );
});

test("an explicit directory preference selects that folder and never falls back when it is missing or invalid", async () => {
  const root = await mkdtemp(
    join(process.env.CLEFT_TEST_TEMP || tmpdir(), "cleft-folder-test-"),
  );
  try {
    const selected = join(root, "Selected Folder");
    await mkdir(selected);
    assert.equal(await resolveSyncFolder(`  ${selected}  `), selected);
    await assert.rejects(
      resolveSyncFolder(join(root, "missing")),
      /Choose your Cleft Local Sync folder/,
    );
    const file = join(root, "not-a-directory.md");
    await writeFile(file, sample());
    await assert.rejects(
      resolveSyncFolder(file),
      /Choose your Cleft Local Sync folder/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
