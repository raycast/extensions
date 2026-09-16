import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  appendToDaily,
  dailyNotePath,
  localDate,
  localTime,
  scanNotes,
  slugify,
  titleOf,
  uniqueNotePath,
} from "../src/lib/notes.ts";

let failed = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n      got:      ${JSON.stringify(actual)}\n      expected: ${JSON.stringify(expected)}`}`,
  );
}

const root = mkdtempSync(join(tmpdir(), "raynotes-"));

// --- titles are read from content, not filenames ---
check("title: first line", titleOf("asd\nasdas\ndas"), "asd");
check("title: heading stripped", titleOf("# 2026-07-29\n\n- 10:00 x"), "2026-07-29");
check("title: leading blank lines skipped", titleOf("\n\n  real title\nmore"), "real title");
check("title: empty falls back to filename", titleOf("   \n\n", "/a/b/my-note.md"), "my-note");

// --- slugs keep non-ASCII, drop only illegal filename characters ---
check("slug: spaces to dashes", slugify("raycast extension fikri"), "raycast-extension-fikri");
check("slug: Turkish preserved", slugify("İş notları çğüöş"), "İş-notları-çğüöş");
check("slug: path separators removed", slugify('a/b\\c:d*e?f"g<h>i|j'), "abcdefghij");
check("slug: collapses and trims dashes", slugify("  a   b  "), "a-b");
check("slug: empty falls back", slugify("///"), "note");

// --- local time, never UTC ---
const midnightish = new Date(2026, 6, 29, 2, 5); // 29 Jul 2026, 02:05 local
check("date: local day at 02:05", localDate(midnightish), "2026-07-29");
check("time: zero padded", localTime(midnightish), "02:05");
check("daily path", dailyNotePath(root, midnightish), join(root, "daily", "2026-07-29.md"));

// --- quick note creates the file, then appends to it ---
const now = new Date(2026, 6, 29, 16, 42);
appendToDaily(root, "first thought", now);
appendToDaily(root, "second thought", new Date(2026, 6, 29, 16, 43));
const daily = readFileSync(dailyNotePath(root, now), "utf-8");
check("daily: header written once", daily.match(/# 2026-07-29/g)?.length, 1);
check(
  "daily: both lines appended",
  daily.includes("- 16:42 first thought") && daily.includes("- 16:43 second thought"),
  true,
);

// --- a file lacking a trailing newline does not swallow the next entry ---
const ragged = join(root, "daily", "2026-07-30.md");
writeFileSync(ragged, "# 2026-07-30\n\n- 09:00 no trailing newline");
appendToDaily(root, "next", new Date(2026, 6, 30, 9, 30));
check(
  "daily: ragged file gets its own line",
  readFileSync(ragged, "utf-8").endsWith("- 09:00 no trailing newline\n- 09:30 next\n"),
  true,
);

// --- collisions suffix instead of overwriting ---
const first = uniqueNotePath(root, "note");
writeFileSync(first, "one");
const second = uniqueNotePath(root, "note");
check("collision: first", first, join(root, "note.md"));
check("collision: second suffixed", second, join(root, "note-2.md"));

// --- scan walks nested folders and reports them relative to the root ---
mkdirSync(join(root, "work", "raycast"), { recursive: true });
writeFileSync(join(root, "work", "raycast", "deep.md"), "deep note\nbody");
writeFileSync(join(root, "skipped.txt"), "not markdown");
mkdirSync(join(root, ".hidden"));
writeFileSync(join(root, ".hidden", "ignored.md"), "hidden");

const scanned = scanNotes(root);
const byTitle = Object.fromEntries(scanned.map((n) => [n.title, n.folder]));
check("scan: nested note found with folder", byTitle["deep note"], join("work", "raycast"));
check("scan: daily note found", byTitle["2026-07-29"], "daily");
check(
  "scan: non-markdown ignored",
  scanned.some((n) => n.path.endsWith(".txt")),
  false,
);
check(
  "scan: hidden folder ignored",
  scanned.some((n) => n.content === "hidden"),
  false,
);
check("scan: newest first", scanned[0].modifiedAt >= scanned[scanned.length - 1].modifiedAt, true);

console.log(failed === 0 ? "\nall checks passed" : `\n${failed} check(s) failed`);
process.exit(failed === 0 ? 0 : 1);
