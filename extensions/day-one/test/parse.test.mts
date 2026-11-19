import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canSignOut,
  classifyCliError,
  cleanBody,
  compareVersions,
  entryTitle,
  findLegacyMcpServers,
  mapsUrl,
  mentions,
  placeLabel,
  timeZoneOrUndefined,
  isLegacyCliTarget,
  parseCliVersion,
  parseSyncProgress,
  plural,
  unsavedRemainder,
} from "../src/lib/parse.ts";

describe("parseCliVersion", () => {
  it("reads the new CLI's version line", () => {
    assert.equal(parseCliVersion("dayone 0.22.1\n"), "0.22.1");
  });
  it("rejects the legacy Mac CLI's output", () => {
    const legacy =
      "Day One CLI\nVersion: 2026.19\nLoaded From: /Applications/Day One.app/Contents/Frameworks/CLIKit.framework";
    assert.equal(parseCliVersion(legacy), null);
  });
});

describe("compareVersions", () => {
  it("compares numerically, not as text", () => {
    assert.ok(compareVersions("0.22.1", "0.9.0") > 0);
    assert.equal(compareVersions("0.22.1", "0.22.1"), 0);
    assert.ok(compareVersions("0.21.9", "0.22.1") < 0);
  });
});

describe("isLegacyCliTarget", () => {
  it("spots the symlink into the Mac app", () => {
    assert.ok(isLegacyCliTarget("/Applications/Day One.app/Contents/MacOS/dayone"));
  });
  it("leaves an npm-installed CLI alone", () => {
    assert.ok(!isLegacyCliTarget("../lib/node_modules/@dayone/cli/run.js"));
  });
});

describe("classifyCliError", () => {
  it("recognizes the CLI's own messages", () => {
    assert.equal(classifyCliError("no auth session for this endpoint; run `dayone auth login` first"), "auth");
    assert.equal(
      classifyCliError(
        "keychain access requires user interaction, but this command is running without an interactive terminal.",
      ),
      "keychain",
    );
    assert.equal(
      classifyCliError(
        "encryption key for profile 1 is set to keychain mode but no keychain entry exists; run `dayone auth key-set`",
      ),
      "encryption-key",
    );
    assert.equal(
      classifyCliError(
        "failed to initialize all-MiniLM-L6-v2 embedding model: Failed to retrieve model.onnx: I/O error Read-only file system (os error 30)",
      ),
      "search-model",
    );
    assert.equal(classifyCliError("connection reset"), "other");
  });
});

describe("parseSyncProgress", () => {
  // Same shape as a real first sync; the journal IDs are made up.
  const log = [
    "[sync] starting run_id=1 base_url=https://dayone.me",
    "[sync] resource start kind=cursor key=journals",
    "[sync] resource page key=journals items=31 has_more=false cursor_advanced=true",
    "[sync] resource done kind=cursor key=journals status=success changed_count=31 cursor_advanced=true",
    "[sync] resource start kind=entries key=entries:111111",
    "[sync] resource page key=entries:111111 items=65 cursor_advanced=true changed_count_total=65",
    "[sync] resource done kind=entries key=entries:111111 status=success changed_count=65 cursor_advanced=true",
    "[sync] resource start kind=entries key=entries:222222",
    "[sync] resource page key=entries:222222 items=1000 cursor_advanced=true changed_count_total=1000",
    "[sync] resource page key=entries:222222 items=1347 cursor_advanced=true changed_count_total=2331",
  ].join("\n");

  it("counts entries across journals while a journal is still downloading", () => {
    const progress = parseSyncProgress(log);
    assert.equal(progress.entries, 65 + 2331);
    assert.equal(progress.journalsStarted, 2);
    assert.equal(progress.journalsDone, 1);
    assert.equal(progress.finished, false);
  });

  it("does not count the journals list as entries", () => {
    assert.equal(parseSyncProgress(log.split("\n").slice(0, 4).join("\n")).entries, 0);
  });

  it("sees the end of the run", () => {
    const progress = parseSyncProgress(`${log}\n[sync] completed run_id=1 status=success`);
    assert.equal(progress.finished, true);
    assert.equal(progress.status, "success");
  });
});

describe("entry text", () => {
  const body = "# Lake day\n\n![](dayone-moment://ABC123)\n\nWe rented a canoe\\. It was *great*\\!\n\n\n\nMore later.";

  it("drops Day One image references and Markdown escapes", () => {
    assert.equal(cleanBody(body), "# Lake day\n\nWe rented a canoe. It was *great*!\n\nMore later.");
  });
  it("uses the first line as the title", () => {
    assert.equal(entryTitle(body), "Lake day");
    assert.equal(entryTitle("![](dayone-moment://ABC123)"), "Untitled Entry");
  });
  it("shows a link's text, not its Markdown, in titles", () => {
    assert.equal(entryTitle("[Secret](https://example.com/s/abc) from the weekend"), "Secret from the weekend");
    assert.equal(entryTitle("![a photo](https://example.com/p.jpg) Morning"), "Morning");
    assert.equal(entryTitle("See <https://example.com> and ~~old~~ new"), "See https://example.com and old new");
  });
  it("skips audio references and Markdown escapes in titles, as the CLI's own title field leaves them", () => {
    assert.equal(entryTitle("![](dayone-moment:/audio/ABC123)\n\nHello?"), "Hello?");
    assert.equal(entryTitle("A lot going on\\.\\.\\. really"), "A lot going on... really");
  });
});

describe("plural", () => {
  it("agrees with the count", () => {
    // Counts follow the system locale, so the expected digits do too.
    assert.equal(plural(1, "entry", "entries"), `${(1).toLocaleString()} entry`);
    assert.equal(plural(8156, "entry", "entries"), `${(8156).toLocaleString()} entries`);
  });
});

describe("findLegacyMcpServers", () => {
  it("finds dayone mcp at the top level and inside Claude Code projects", () => {
    const config = {
      mcpServers: { "day-one": { command: "dayone", args: ["mcp"] }, other: { command: "npx", args: ["x"] } },
      projects: { "/some/project": { mcpServers: { journal: { command: "/usr/local/bin/dayone", args: ["mcp"] } } } },
    };
    assert.deepEqual(findLegacyMcpServers(config).sort(), ["day-one", "journal"]);
  });
  it("ignores servers already moved to dayone-mac", () => {
    assert.deepEqual(findLegacyMcpServers({ mcpServers: { d: { command: "dayone-mac", args: ["mcp"] } } }), []);
  });
});

describe("mentions", () => {
  it("matches a whole word, ignoring case, like the CLI's keyword search", () => {
    assert.ok(mentions("Morning Coffee with friends", "coffee"));
    assert.ok(mentions("coffee.", "coffee"));
    assert.ok(!mentions("coffeehouse", "coffee"));
    assert.ok(!mentions("Sussex", "sex"));
  });
  it("treats regex characters in the query literally", () => {
    assert.ok(mentions("learning c++ today", "c++"));
    assert.ok(!mentions("anything", "a.*"));
  });
});

describe("places", () => {
  const place = {
    name: "Cafe",
    locality: "Oakland",
    area: "CA",
    country: "United States",
    latitude: 37.8,
    longitude: -122.27,
  };
  it("labels the most specific three parts", () => {
    assert.equal(placeLabel(place), "Cafe, Oakland, CA");
    assert.equal(placeLabel({ name: "Oakland", locality: "Oakland" }), "Oakland");
  });
  it("links Apple Maps on a Mac and Google Maps elsewhere", () => {
    assert.match(mapsUrl(place, "darwin") ?? "", /^https:\/\/maps\.apple\.com\/\?ll=37\.8%2C-122\.27&q=/);
    assert.equal(mapsUrl(place, "win32"), "https://www.google.com/maps/search/?api=1&query=37.8%2C-122.27");
    assert.equal(mapsUrl({}, "darwin"), undefined);
  });
});

describe("canSignOut", () => {
  it("allows signing out only when nothing is waiting to upload, as far as the CLI can confirm", () => {
    assert.equal(canSignOut(0), true);
    for (const total of [1, -1, Number.NaN, undefined, null, "0"]) assert.equal(canSignOut(total), false);
  });
});

describe("timeZoneOrUndefined", () => {
  it("keeps a real IANA time zone", () => {
    assert.equal(timeZoneOrUndefined("America/Los_Angeles"), "America/Los_Angeles");
  });
  it("drops null, empty and unknown zones, which make toLocaleString throw", () => {
    assert.equal(timeZoneOrUndefined(null), undefined);
    assert.equal(timeZoneOrUndefined(""), undefined);
    assert.equal(timeZoneOrUndefined("Not/AZone"), undefined);
  });
});

describe("unsavedRemainder", () => {
  it("clears the form when nothing changed while saving", () => {
    assert.equal(unsavedRemainder("Lake day", "Lake day"), "");
  });
  it("keeps only the text added after the saved entry", () => {
    assert.equal(unsavedRemainder("Lake day", "Lake day\n\nAnd then it rained."), "And then it rained.");
  });
  it("keeps everything when the saved text itself was edited, so nothing is lost", () => {
    assert.equal(unsavedRemainder("Lake day", "Lake trip day"), "Lake trip day");
  });
});
