import assert from "node:assert/strict";
import { test } from "node:test";
import { inline, untrusted } from "../src/lib/markdown.ts";
import {
  actionOutcome,
  appLink,
  displayName,
  formatAddresses,
  formatBytes,
  formatDuration,
  toDate,
} from "../src/lib/types.ts";

test("markdown: untrusted text cannot load images or become LaTeX", () => {
  const body = untrusted(
    "Hi\n\n![](https://t.example/p.gif)\n![Logo](https://t.example/l.png)\n1. not a list\n    code?\n$5 \\(x\\) &#40;",
  );
  // Tracking pixels vanish; images keep only their alt text.
  assert.doesNotMatch(body, /t\.example/);
  assert.match(body, /\nLogo  \n/);
  // No markdown or LaTeX syntax survives outside the links.
  assert.doesNotMatch(body, /[[\]()\\$!]/);
  assert.match(body, /1&#46; not a list/);
  assert.match(body, /\ncode\?  \n/);
  // A literal entity in the email stays literal instead of decoding.
  assert.match(body, /&#38;&#35;40;$/);
});

test("markdown: http(s) and mailto links render as clickable text", () => {
  assert.equal(
    untrusted("[Verification code](https://app.link.com?eid=em_2ngss)"),
    "[Verification code](<https://app.link.com?eid=em_2ngss>)",
  );
  assert.equal(untrusted("[Write us](mailto:help@x.io?subject=Hi)"), "[Write us](<mailto:help@x.io?subject=Hi>)");
  assert.equal(untrusted("[Docs](https://x.io/a_(b))."), "[Docs](<https://x.io/a_(b)>).");
  assert.equal(untrusted("[*bold* \\(x\\)](https://x.io)"), "[&#42;bold&#42; &#92;&#40;x&#92;&#41;](<https://x.io>)");
  assert.equal(untrusted("[ ](https://x.io)"), "<https://x.io>");
  assert.equal(inline("[click](http://x.io)"), "[click](<http://x.io>)");
});

test("markdown: misplaced bold markers are dropped", () => {
  assert.equal(
    untrusted("Valentyna Humenna** mentioned you** on a work item"),
    "Valentyna Humenna mentioned you on a work item",
  );
  assert.equal(untrusted("** Valentyna Humenna** 12:43 PM"), "Valentyna Humenna 12:43 PM");
  assert.equal(untrusted("a * b = c"), "a &#42; b &#61; c");
});

test("markdown: only http(s) and mailto links are links", () => {
  assert.equal(untrusted("[Run](javascript:alert(1))"), "&#91;Run&#93;&#40;javascript:alert&#40;1&#41;&#41;");
  assert.equal(untrusted("[Open](raycast://extensions/x/y)"), "&#91;Open&#93;&#40;raycast://extensions/x/y&#41;");
});

test("markdown: bare URLs stay intact and clickable", () => {
  assert.equal(untrusted("See https://x.io/a_(b)_c, then."), "See <https://x.io/a_(b)_c>, then.");
  assert.equal(untrusted("(https://x.io/path)"), "&#40;<https://x.io/path>&#41;");
  assert.equal(untrusted("https://x.io/?q=$1\\(a\\)"), "<https://x.io/?q=%241%5C(a%5C)>");
  assert.equal(untrusted("https:// alone"), "https:// alone");
});

test("query: splits topic from Gmail-style operators", async () => {
  const { splitQuery } = await import("../src/lib/query.ts");
  assert.deepEqual(splitQuery('budget review from:alice@co.com subject:"q3 plan" newer_than:30d'), {
    topic: "budget review",
    filter: 'from:alice@co.com subject:"q3 plan" newer_than:30d',
    folder: undefined,
  });
  assert.deepEqual(splitQuery("is:unread"), { topic: "", filter: "is:unread", folder: undefined });
  assert.deepEqual(splitQuery("re: invoice"), { topic: "re: invoice", filter: "", folder: undefined });
  // A tip leaves the operator waiting for its value; nothing is searched yet.
  assert.deepEqual(splitQuery("from:"), { topic: "", filter: "", folder: undefined });
  assert.deepEqual(splitQuery("in:SENT is:unread"), { topic: "", filter: "is:unread", folder: "Sent" });
});

test("args: list, cliDate, rangeArgs", async () => {
  const { cliDate, list, rangeArgs } = await import("../src/lib/args.ts");
  assert.deepEqual(list(" a@x.io, b@y.io;c@z.io\n"), ["a@x.io", "b@y.io", "c@z.io"]);
  assert.equal(cliDate(new Date(2026, 0, 5, 9, 7)), "2026-01-05T09:07");
  assert.equal(cliDate(new Date(2026, 0, 5), true), "2026-01-05");
  assert.deepEqual(rangeArgs({ range: "week" }), ["--week"]);
  assert.deepEqual(rangeArgs({ range: "week", start: "2026-01-01", end: "2026-01-02" }), [
    "--start",
    "2026-01-01",
    "--end",
    "2026-01-02",
  ]);
});

test("args: option values and positionals are safe from option parsing", async () => {
  const { positional } = await import("../src/lib/args.ts");
  assert.equal(positional("--help"), "help");
  assert.equal(positional("- item"), "item");
  assert.equal(positional("q3 - plan"), "q3 - plan");
});

test("args: value options are joined with =", async () => {
  const { joinOptionValues } = await import("../src/lib/args.ts");
  assert.deepEqual(joinOptionValues(["draft", "--body", "- item\n- two", "--no-signature", "--to", "a@x.io"]), [
    "draft",
    "--body=- item\n- two",
    "--no-signature",
    "--to=a@x.io",
  ]);
  assert.deepEqual(joinOptionValues(["meeting", "--notes", "42"]), ["meeting", "--notes", "42"]);
});

test("types: dates, addresses, links, sizes", () => {
  assert.equal(toDate("2026-09-29T08:08:56Z")?.getTime(), Date.UTC(2026, 8, 29, 8, 8, 56));
  assert.equal(toDate("-"), undefined);
  assert.equal(toDate(undefined), undefined);
  assert.equal(displayName({ name: " ", email: "a@x.io" }), "a@x.io");
  assert.equal(displayName({ name: "Bob", email: "b@x.io" }), "Bob");
  assert.equal(
    formatAddresses([{ name: "Smith, Jane", email: "j@x.io" }, { email: "b@y.io" }]),
    "Smith, Jane <j@x.io>, b@y.io",
  );
  assert.equal(appLink("https://sparkmailapp.com/dpl/bl?token=AbC123"), "readdle-spark://bl=AbC123");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(250_880), "245 KB");
  assert.equal(formatBytes(1_258_291), "1.2 MB");
  assert.equal(formatDuration(3900), "1h 5m");
  assert.equal(formatDuration(2700), "45m");
  assert.equal(formatDuration(0), undefined);
});

test("types: action outcome counts per-message statuses", () => {
  assert.deepEqual(
    actionOutcome({
      action: "archive",
      messages: [
        { id: "48190", status: "done" },
        { id: "50001", status: "refused", reason: "account does not have triage access" },
        { id: "9", status: "skipped" },
      ],
    }),
    {
      succeeded: 1,
      total: 3,
      problems: ["50001: account does not have triage access", "9: skipped"],
      refused: true,
    },
  );
  assert.equal(
    actionOutcome({ action: "send", messages: [{ id: "900", status: "sent", message_id: 901 }] }).succeeded,
    1,
  );
});

test("avatar: initials and a full-size avatar", async () => {
  const { avatarSVG, initials } = await import("../src/lib/avatar.ts");
  assert.equal(initials("Rita Stone"), "RS");
  assert.equal(initials("Capture One Account"), "CA");
  assert.equal(initials("linkedin"), "L");
  assert.equal(initials("oliver.brooks@example.com"), "OB");
  assert.equal(initials("noreply@github.com"), "N");
  assert.equal(initials("Дмитро Коваль"), "ДК");
  assert.equal(initials("  "), "");

  const decode = (uri: string) => Buffer.from(uri.replace("data:image/svg+xml;base64,", ""), "base64").toString();
  // The avatar fills the icon; unread is shown by the date, not here.
  assert.match(decode(avatarSVG({ name: "Rita Stone" })), /<circle cx="32" cy="32" r="32" fill=/);
  assert.doesNotMatch(decode(avatarSVG({ name: "Rita Stone" })), /#0A84FF/);
  assert.match(
    decode(avatarSVG({ name: "X", photo: "AAAA" })),
    /<image href="data:image\/png;base64,AAAA" x="0" y="0" width="64"/,
  );
  // Initials are letters and digits only, so a name can't inject markup.
  assert.doesNotMatch(decode(avatarSVG({ name: '"><script>x</script>' })), /<script/);
});

test("avatar: account color ring", async () => {
  const { avatarSVG } = await import("../src/lib/avatar.ts");
  const decode = (uri: string) => Buffer.from(uri.replace("data:image/svg+xml;base64,", ""), "base64").toString();
  const ringed = decode(avatarSVG({ name: "Rita Stone", ring: "#C56BDA" }));
  assert.match(ringed, /<circle cx="32" cy="32" r="30" fill="none" stroke="#C56BDA" stroke-width="4"\/>/);
  // The avatar shrinks to leave a gap inside the ring.
  assert.match(ringed, /<circle cx="32" cy="32" r="25" fill=/);
  // Anything but a strict #RRGGBB is ignored.
  assert.doesNotMatch(decode(avatarSVG({ name: "X", ring: 'red"/><script>' })), /stroke|script/);
  assert.match(decode(avatarSVG({ name: "X" })), /<circle cx="32" cy="32" r="32"/);
});

test("accounts: colors and row lookup", async () => {
  const { accountColors, rowColor } = await import("../src/lib/colors.ts");
  const colors = accountColors({
    accounts: [
      {
        email: "Me@Example.com",
        access: "triage",
        color: "#C56BDA",
        aliases: [],
        calendars: [],
        teams: [{ name: "Acme", shared_inboxes: [{ email: "support@acme.io", access: "send", color: "#00CD00" }] }],
      },
      { email: "other@example.com", access: "read-only", aliases: [], calendars: [], teams: [] },
    ],
  });
  assert.equal(rowColor(colors, "me@example.com"), "#C56BDA");
  assert.equal(rowColor(colors, "support@acme.io"), "#00CD00");
  assert.equal(rowColor(colors, "other@example.com"), undefined);
  assert.equal(rowColor(colors, "Support Team"), undefined);
  assert.equal(rowColor(colors, undefined, ["bob@x.io", "ME@example.com"]), "#C56BDA");
});

test("markdown: headings from Spark's text form show bold", () => {
  assert.equal(untrusted("### Hi Developers at Spark Mail App,"), "**Hi Developers at Spark Mail App,**");
  assert.equal(untrusted("#hashtag"), "&#35;hashtag");
  assert.equal(untrusted("### "), "&#35;&#35;&#35; ");
});

test("thread: Spark-style layout", async () => {
  const { messageDate, recipientNames, threadMarkdown } = await import("../src/lib/thread.ts");
  const now = new Date(2026, 8, 29);
  assert.match(messageDate("2026-09-24T14:42:00Z", now), /24 Sept?|Sep 24/);
  assert.match(messageDate("2025-01-02T10:00:00Z", now), /2025/);
  assert.equal(recipientNames([{ name: "Alex Rivera", email: "a@x.io" }]), "Alex Rivera");
  assert.equal(recipientNames([{ email: "a@x.io" }, { email: "b@x.io" }, { email: "c@x.io" }]), "a@x.io and 2 others");

  const headers: string[][] = [];
  const md = threadMarkdown(
    {
      subject: "Laptop request",
      labels: ["alex@work.example.com:Important"],
      link: "https://sparkmailapp.com/dpl/bl?token=T",
      shared_with: [],
      assigned_by: [],
      assigned_to: [],
      messages: [
        {
          id: 1,
          type: "Email",
          from: [{ name: "IT Support Portal", email: "it@x.io" }],
          reply_to: [],
          to: [{ name: "Alex Rivera", email: "a@x.io" }],
          cc: [],
          bcc: [],
          date: "2026-09-24T14:42:00Z",
          flags: [],
          body: "Just confirming that we got your request.",
          attachments: [{ id: 9, name: "report.pdf", size: 250_880, mime_type: "application/pdf" }],
        },
        {
          id: 2,
          type: "Chat Message",
          from: [{ name: "Bob", email: "b@x.io" }],
          reply_to: [],
          to: [],
          cc: [],
          bcc: [],
          flags: [],
          body: "",
          attachments: [],
        },
      ],
    },
    (message, name, detail) => {
      headers.push([name, detail]);
      return message.from[0]?.email === "it@x.io" ? { url: "file:///tmp/it.svg", width: 300, height: 32 } : undefined;
    },
    now,
  );
  const [head, first, second] = md.split("\n\n---\n\n");
  assert.equal(head, "# Laptop request\n\n🏷 Important");
  assert.match(headers[0][0], /^IT Support Portal$/);
  assert.match(headers[0][1], /^to Alex Rivera · /);
  assert.equal(headers[1][0], "💬 Bob");
  assert.match(first, /^!\[\]\(file:\/\/\/tmp\/it\.svg\?raycast-width=300&raycast-height=32\)&nbsp;\n\n/);
  assert.match(first, /\n\nJust confirming that we got your request\.\n\n📎 report\.pdf · 245 KB$/);
  // Without a header image, the header is text.
  assert.match(second, /^\*\*💬 Bob\*\* \n\n_\(no text\)_$/);
});

test("avatar: message header image", async () => {
  const { HEADER_MAX_WIDTH, headerSVG, textWidth } = await import("../src/lib/avatar.ts");
  const decode = (uri: string) => Buffer.from(uri.replace("data:image/svg+xml;base64,", ""), "base64").toString();
  const header = headerSVG({ name: "IT Support Portal", detail: "to Alex Rivera · 24 Sep, 4:42 PM", dark: true });
  const svg = decode(header.uri);
  assert.equal(header.height, 32);
  assert.match(
    svg,
    /<tspan font-weight="600" fill="#FFFFFF">IT Support Portal<\/tspan><tspan dx="6" fill="#A1A1A6">to Alex Rivera · 24 Sep, 4:42 PM<\/tspan>/,
  );
  assert.ok(header.width > 38 + textWidth("IT Support Portal", 15, true));
  // Long text is cut to fit instead of widening the image past the pane.
  const long = headerSVG({ name: "N".repeat(200), detail: "d".repeat(400), dark: false });
  assert.ok(long.width <= HEADER_MAX_WIDTH);
  assert.match(decode(long.uri), /…<\/tspan>/);
  // Names are text content, escaped.
  assert.doesNotMatch(decode(headerSVG({ name: "<b>x</b>", detail: "", dark: true }).uri), /<b>/);
});

test("tips: Spark's grid in the CLI's syntax", async () => {
  const { searchTips, tipsSVG } = await import("../src/lib/tips.ts");
  const columns = searchTips(new Date(2026, 8, 29));
  assert.equal(columns.length, 4);
  assert.ok(columns.every((column) => column.length === 4));
  assert.deepEqual(
    columns.map((column) => column[0].syntax),
    ["from:alex", "subject:asap", "in:inbox", "cc:john"],
  );
  const svg = Buffer.from(tipsSVG(true).split(",")[1], "base64").toString();
  assert.match(svg, /&#34;spark email&#34;/);
  assert.match(svg, /Combine keywords for better results/);
  assert.match(svg, /fill="#E5E5EA"/);
  // Under Raycast's ~240 pt height limit, so it's shown at full size, and
  // within its ~750 pt window.
  const [, width, height] = svg.match(/<svg[^>]* width="([\d.]+)" height="([\d.]+)"/)!.map(Number);
  assert.ok(height <= 240, `tips are ${height} tall`);
  assert.ok(width <= 730, `tips are ${width} wide`);
});

test("attendees: finished addresses, the word being typed, and picking a contact", async () => {
  const { parseAttendees, pickAttendee } = await import("../src/lib/attendees.ts");
  assert.deepEqual(parseAttendees(""), { emails: [], partial: "" });
  assert.deepEqual(parseAttendees("ale"), { emails: [], partial: "ale" });
  assert.deepEqual(parseAttendees("bob@co.io, ale"), { emails: ["bob@co.io"], partial: "ale" });
  assert.deepEqual(parseAttendees("bob@co.io, alex@co.io"), { emails: ["bob@co.io", "alex@co.io"], partial: "" });
  // A trailing separator finishes the word; an unfinished address stays a partial.
  assert.deepEqual(parseAttendees("bob@co.io, "), { emails: ["bob@co.io"], partial: "" });
  assert.deepEqual(parseAttendees("alex@co"), { emails: [], partial: "alex@co" });
  assert.deepEqual(parseAttendees("Bob@Co.io bob@co.io"), { emails: ["bob@co.io"], partial: "" });
  assert.equal(pickAttendee("bob@co.io, ale", "alex@co.io"), "bob@co.io, alex@co.io, ");
  assert.equal(pickAttendee("ale", "alex@co.io"), "alex@co.io, ");
});

test("avatar: contact card centers the avatar, name, and address", async () => {
  const { contactCardSVG } = await import("../src/lib/avatar.ts");
  const decode = (uri: string) => Buffer.from(uri.replace("data:image/svg+xml;base64,", ""), "base64").toString();
  const card = contactCardSVG({ name: "Rita Stone", email: "rita@co.io", dark: true });
  const svg = decode(card.uri);
  assert.equal(card.width, 420);
  assert.match(svg, /<circle cx="210" cy="48" r="48" fill=/);
  assert.match(svg, /text-anchor="middle"[^>]*font-weight="600" fill="#FFFFFF">Rita Stone</);
  assert.match(svg, />rita@co\.io</);
  // A contact with no name shows the address once.
  assert.equal(
    decode(contactCardSVG({ name: "a@x.io", email: "a@x.io", dark: false }).uri).match(/a@x\.io/g)?.length,
    1,
  );
  assert.match(
    decode(contactCardSVG({ name: "X", email: "x@y.io", photo: "AAAA", photoType: "image/jpeg", dark: true }).uri),
    /href="data:image\/jpeg;base64,AAAA"/,
  );
  // Details: labels end at the center line, values start after it.
  const withDetails = contactCardSVG({
    name: "Alex Rivera",
    email: "a@x.io",
    dark: true,
    details: [
      ["Category", "Notifications"],
      ["Priority", "No"],
    ],
  });
  const detailSVG = decode(withDetails.uri);
  assert.match(
    detailSVG,
    /<text x="202" y="\d+" text-anchor="end"[^>]*>Category<\/text><text x="218"[^>]*>Notifications</,
  );
  assert.ok(withDetails.height > card.height + 40);
});

test("tips: embeds Spark's own icons, keeping their root attributes", async () => {
  const { tipsSVG } = await import("../src/lib/tips.ts");
  const icon =
    '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1" stroke="currentColor"/></svg>';
  const svg = Buffer.from(tipsSVG(true, { delegated: icon }).split(",")[1], "base64").toString();
  // Positioned and sized, colored for currentColor, fill="none" kept.
  assert.match(
    svg,
    /<svg x="0" y="\d+" width="16" height="16" color="#8B5CF6" viewBox="0 0 14 14" fill="none" xmlns="http:\/\/www\.w3\.org\/2000\/svg"><path d="M1 1" stroke="currentColor"\/><\/svg>/,
  );
  // Glyphs without a Spark icon fall back to the drawn one.
  assert.match(svg, /<g transform="translate\(0 \d+\)" fill="none" stroke="#3B82F6"/);
});

test("avatar: contact card rows without a label continue the one above", async () => {
  const { contactCardSVG } = await import("../src/lib/avatar.ts");
  const svg = Buffer.from(
    contactCardSVG({
      name: "Alex Rivera",
      email: "alex.rivera@example.com",
      dark: true,
      details: [
        ["Other emails", "alex@work.example.com"],
        ["", "alex@home.example.com"],
        ["Category", "People"],
      ],
    }).uri.split(",")[1],
    "base64",
  ).toString();
  const values = [...svg.matchAll(/<text x="218" y="(\d+)"[^>]*>([^<]+)</g)].map((m) => [Number(m[1]), m[2]]);
  assert.deepEqual(
    values.map(([, v]) => v),
    ["alex@work.example.com", "alex@home.example.com", "People"],
  );
  // Each address on its own line.
  assert.ok(values[1][0] > values[0][0] && values[2][0] > values[1][0]);
});

test("avatar: contact card widens for long details instead of cutting them", async () => {
  const { contactCardSVG } = await import("../src/lib/avatar.ts");
  const card = contactCardSVG({
    name: "Alex Rivera",
    email: "a@x.io",
    dark: true,
    details: [["Other emails", "alex.rivera.newsletters@example.com"]],
  });
  assert.ok(card.width > 420 && card.width <= 700);
  assert.doesNotMatch(Buffer.from(card.uri.split(",")[1], "base64").toString(), /…/);
  assert.equal(contactCardSVG({ name: "X", email: "x@y.io", dark: true, details: [["A", "b"]] }).width, 420);
});

test("folders: system icons for Spark's own folders, label or folder for the rest", async () => {
  const { folderRows, sectionId, sectionSubtitle, sectionTitle } = await import("../src/lib/folders.ts");
  const section = {
    kind: "shared_inbox" as const,
    email: "news@x.io",
    uses_gmail_labels: true,
    excludes_shared_inboxes: false,
    folders: [
      { name: "Inbox", identifier: "news@x.io:Inbox", message_count: 5 },
      { name: "Later", identifier: "news@x.io:Later", message_count: 1 },
      { name: "Marketing", identifier: "news@x.io:Marketing", message_count: 2 },
      { name: "Later", identifier: "news@x.io:Later 2", message_count: 0 },
    ],
  };
  assert.deepEqual(
    folderRows(section).map((f) => [f.name, f.icon, f.system]),
    [
      ["Inbox", "SystemFolderInbox", true],
      ["Later", "SystemFolderSnooze", true],
      ["Marketing", "Label", false],
      // A custom label with a system folder's name is still a label.
      ["Later", "Label", false],
    ],
  );
  assert.equal(folderRows({ ...section, uses_gmail_labels: false }).at(2)?.icon, "Folder");
  assert.equal(sectionTitle(section), "news@x.io");
  assert.equal(sectionSubtitle(section), "Shared inbox");
  assert.equal(sectionId(section), "shared_inbox:news@x.io");
  const unified = { kind: "unified" as const, uses_gmail_labels: false, excludes_shared_inboxes: true, folders: [] };
  assert.equal(sectionTitle(unified), "All Accounts");
  assert.equal(sectionId(unified), "unified");
});

test("recipients: pool merges by address, lists come from props and drafts", async () => {
  const { addressList, mergePeople } = await import("../src/lib/recipients.ts");
  const pool = mergePeople(new Map(), [{ email: "Alex@Example.com" }]);
  const named = mergePeople(pool, [{ email: "alex@example.com", name: "Alex Doe" }]);
  assert.deepEqual([...named.values()], [{ email: "Alex@Example.com", name: "Alex Doe" }]);
  assert.equal(mergePeople(named, [{ email: "ALEX@example.com" }]), named);

  assert.deepEqual(addressList("a@b.co, A@b.co; c@d.co,"), ["a@b.co", "c@d.co"]);
  assert.deepEqual(addressList(["x@y.co"]), ["x@y.co"]);
});

test("recipients: labels carry the address", async () => {
  const { personLabel } = await import("../src/lib/recipients.ts");
  assert.equal(personLabel({ email: "a@b.co", name: " Alex Rivera " }), "Alex Rivera <a@b.co>");
  assert.equal(personLabel({ email: "a@b.co", name: "A@B.co" }), "a@b.co");
  assert.equal(personLabel({ email: "a@b.co" }), "a@b.co");
});

test("setup card: wraps the intro and lists the steps", async () => {
  const { setupCardSVG, wrap } = await import("../src/lib/setupCard.ts");
  assert.deepEqual(wrap("one two three", 60, 15), ["one two", "three"]);
  const card = setupCardSVG({
    title: "Spark",
    intro: "Turn on Spark CLI <now>",
    steps: ["Open Settings → AI Agents", "Turn on Spark CLI Setup"],
    dark: true,
  });
  const svg = Buffer.from(card.uri.split(",")[1], "base64").toString();
  assert.ok(svg.includes(">1.</text>") && svg.includes(">2.</text>"));
  assert.ok(svg.includes("&#60;now&#62;"));
  assert.ok(!svg.includes("<image"));
  assert.equal(card.width, 600);
});

test("heading: plain punctuation stays, formatting and links are escaped", async () => {
  const { heading } = await import("../src/lib/markdown.ts");
  assert.equal(heading("spark-cli-skills -- one-file change (v2)"), "spark-cli-skills -- one-file change (v2)");
  assert.equal(heading("**Big** _deal_ $500 #1"), "\\*\\*Big\\*\\* \\_deal\\_ \\$500 \\#1");
  assert.equal(
    heading("![x](https://t.co/p.png) [a](https://x.io)"),
    "\\!\\[x](https://t.co/p.png) \\[a](https://x.io)",
  );
  assert.equal(heading("a\\(b\\)"), "a\\\\(b\\\\)");
  assert.equal(heading("<img src=x>  two\n lines"), "\\<img src=x\\> two lines");
});

test("held replies: only a lone message is a hold", async () => {
  const { isHeld } = await import("../src/lib/types.ts");
  assert.equal(isHeld({ message: "Queued: Send draft\nNothing has been sent yet." }), true);
  assert.equal(isHeld({ action: "send", messages: [] }), false);
  assert.equal(isHeld({ message: "x", action: "send" }), false);
  assert.equal(isHeld(null), false);
});

test("coalescing: callers asking the same thing at once share one run", async () => {
  const { coalescing } = await import("../src/lib/coalesce.ts");
  const shared = coalescing<number>();
  let runs = 0;
  let release: (value: number) => void = () => {};
  const task = () => {
    runs++;
    return new Promise<number>((resolve) => (release = resolve));
  };
  const first = shared("emails", task);
  const second = shared("emails", task);
  assert.equal(first, second);
  assert.equal(runs, 1);
  // A different request runs on its own.
  void shared("events", () => Promise.resolve(0));
  release(7);
  assert.equal(await second, 7);
  // Once settled, the next caller asks again.
  await shared("emails", async () => {
    runs++;
    return 8;
  });
  assert.equal(runs, 2);
});

test("coalescing: a failure reaches every caller and isn't kept", async () => {
  const { coalescing } = await import("../src/lib/coalesce.ts");
  const shared = coalescing<number>();
  const failing = () => Promise.reject(new Error("Spark is busy"));
  const results = await Promise.allSettled([shared("emails", failing), shared("emails", failing)]);
  assert.deepEqual(
    results.map((r) => r.status),
    ["rejected", "rejected"],
  );
  assert.equal(await shared("emails", async () => 1), 1);
});

test("windows cli: the user PATH from the registry, then the process PATH", async () => {
  const { expandVariables, registryPathValue, windowsSearchDirs } = await import("../src/lib/cliPath.ts");
  const env = { LOCALAPPDATA: "C:\\Users\\a\\AppData\\Local", UserProfile: "C:\\Users\\a" };
  const output = [
    "",
    "HKEY_CURRENT_USER\\Environment",
    "    Path    REG_EXPAND_SZ    C:\\Spark\\SparkCore.bundle;%LOCALAPPDATA%\\Microsoft\\WindowsApps;%userprofile%\\bin;",
    "",
  ].join("\r\n");
  assert.equal(
    registryPathValue(output, env),
    "C:\\Spark\\SparkCore.bundle;C:\\Users\\a\\AppData\\Local\\Microsoft\\WindowsApps;C:\\Users\\a\\bin;",
  );
  assert.equal(registryPathValue("ERROR: The system was unable to find the specified registry key", env), undefined);
  // An unknown name stays as it is, the way Windows leaves it.
  assert.equal(expandVariables("%NOPE%\\x", env), "%NOPE%\\x");
  // Registry folders come first; repeats (any case) and quotes are dropped.
  assert.deepEqual(windowsSearchDirs('C:\\Windows;"C:\\Tools";c:\\spark', "C:\\Spark;;"), [
    "C:\\Spark",
    "C:\\Windows",
    "C:\\Tools",
  ]);
  assert.deepEqual(windowsSearchDirs(undefined, undefined), []);
});
