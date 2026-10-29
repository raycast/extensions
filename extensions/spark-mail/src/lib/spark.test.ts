import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cleanLink,
  parseAccounts,
  parseAttachments,
  parseEmailTable,
  parseEvents,
  parseFolders,
  parseRecords,
} from "./parse.ts";
import { sparkSearch } from "./platform.ts";

// Fixtures use CRLF line endings, as emitted by spark.exe on Windows.
const crlf = (s: string) => s.replace(/\n/g, "\r\n");

test("sparkSearch: Windows looks for spark.exe in the Spark Desktop bundle", () => {
  const s = sparkSearch("win32", {
    LOCALAPPDATA: "C:\\Users\\me\\AppData\\Local",
  });
  assert.equal(s.bin, "spark.exe");
  assert.equal(s.findCmd, "where.exe spark");
  assert.match(
    s.dirs[0],
    /^C:\\Users\\me\\AppData\\Local\\Programs\\SparkDesktop\\/,
  );
  assert.match(s.dirs[0], /SparkCore\.bundle$/);
});

test("sparkSearch: macOS keeps Homebrew + /usr/local defaults", () => {
  const s = sparkSearch("darwin", {});
  assert.equal(s.bin, "spark");
  assert.equal(s.findCmd, "which spark");
  assert.deepEqual(s.dirs, [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
  ]);
});

test("parseEmailTable: CRLF rows parse without trailing \\r", () => {
  const out =
    crlf(`ID     Account        From            Date         Subject       Flags
12345  me@example.com Alice <a@x.io>  2026-09-11   Hello there   unread
12346  me@example.com Bob <b@x.io>    2026-09-10   Re: Hi

Page 1 of 3
`);
  const rows = parseEmailTable(out);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    id: "12345",
    account: "me@example.com",
    from: "Alice <a@x.io>",
    date: "2026-09-11",
    subject: "Hello there",
    flags: "unread",
  });
  assert.equal(rows[1].flags, "");
});

test("parseRecords: CRLF thread dump yields clean headers and body", () => {
  const out = crlf(`Thread: Hello there
Messages: 1
Link: https://sparkmailapp.com/dpl/bl?token=abc%0D%0Adef

──────────────────────────────────────────

  ID: 12345
  From: Alice <a@x.io>
  Date: 2026-09-11

Line one
Line two
`);
  const { summary, records } = parseRecords(out);
  assert.equal(summary.thread, "Hello there");
  assert.equal(records.length, 1);
  assert.equal(records[0].headers.from, "Alice <a@x.io>");
  assert.equal(records[0].body, "Line one\nLine two");
  assert.ok(!records[0].body.includes("\r"));
});

test("cleanLink: strips raw and URL-encoded line breaks", () => {
  assert.equal(
    cleanLink("https://x.io/dpl/bl?token=abc%0D%0Adef%0D%0Aghi"),
    "https://x.io/dpl/bl?token=abcdefghi",
  );
  assert.equal(
    cleanLink("https://x.io/dpl/bl?token=abc\n def"),
    "https://x.io/dpl/bl?token=abcdef",
  );
  assert.equal(cleanLink(""), undefined);
});

test("parseAccounts: CRLF access levels parse", () => {
  const accounts = parseAccounts(
    crlf(`Email Account: a@x.io "Alias" (Access: read-only)
└── Calendar: Work - read-only
Email Account: b@x.io (Access: triage)
`),
  );
  assert.deepEqual(accounts, [
    { email: "a@x.io", access: "read-only" },
    { email: "b@x.io", access: "triage" },
  ]);
});

test("parseFolders: CRLF folder tree parses", () => {
  const groups = parseFolders(
    crlf(`a@x.io
  Inbox        12 messages (Inbox)
  Archive       3 messages (a@x.io:Archive)
`),
  );
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].folders[1], {
    name: "Archive",
    count: 3,
    id: "a@x.io:Archive",
  });
});

test("parseAttachments: CRLF Path line keeps a clean Windows path", () => {
  const atts = parseAttachments(
    crlf(`Attachments:
- invoice.pdf (Size: 10 KB, Type: attachment)
  Path: C:\\Users\\me\\AppData\\Local\\Spark\\invoice.pdf

`),
  );
  assert.equal(atts.length, 1);
  assert.equal(
    atts[0].path,
    "C:\\Users\\me\\AppData\\Local\\Spark\\invoice.pdf",
  );
});

test("parseEvents: CRLF agenda parses title, time, details", () => {
  const events = parseEvents(
    crlf(`── Thursday, Sep 11, 2026 ──────
Standup
  ID: 7
10:00 – 10:15
  Calendar: Work
`),
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].day, "Thursday, Sep 11, 2026");
  assert.equal(events[0].title, "Standup");
  assert.equal(events[0].time, "10:00 – 10:15");
  assert.equal(events[0].details, "Calendar: Work");
});
