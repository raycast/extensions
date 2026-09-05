import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCommandLine, parseExecutables } from "../src/core/ps";

const EXECUTABLES = parseExecutables(
  [
    "  946 /Applications/Google Drive.app/Contents/MacOS/Google Drive",
    "    1 /sbin/launchd",
    "    0 /kernel",
  ].join("\n"),
);

describe("parseExecutables", () => {
  it("keeps spaces in an application path", () => {
    assert.equal(EXECUTABLES.get(946), "/Applications/Google Drive.app/Contents/MacOS/Google Drive");
  });

  it("drops PIDs that are not safe to signal", () => {
    assert.equal(EXECUTABLES.has(0), false);
    assert.equal(EXECUTABLES.get(1), "/sbin/launchd");
  });
});

describe("parseCommandLine", () => {
  it("splits the fixed columns off and leaves the command line intact", () => {
    const details = parseCommandLine(
      "  946     1 alice             Sun Aug 30 17:37:40 2026     /Applications/Google Drive.app/Contents/MacOS/Google Drive --flag",
      EXECUTABLES,
    );

    assert.ok(details);
    assert.equal(details.pid, 946);
    assert.equal(details.ppid, 1);
    assert.equal(details.user, "alice");
    assert.equal(details.started, "Sun Aug 30 17:37:40 2026");
    assert.equal(details.commandLine, "/Applications/Google Drive.app/Contents/MacOS/Google Drive --flag");
  });

  it("takes the executable from comm rather than slicing the command line at a space", () => {
    const details = parseCommandLine(
      "  946     1 alice Sun Aug 30 17:37:40 2026 /Applications/Google Drive.app/Contents/MacOS/Google Drive",
      EXECUTABLES,
    );

    assert.equal(details?.executable, "/Applications/Google Drive.app/Contents/MacOS/Google Drive");
  });

  it("handles a space-padded day of month", () => {
    const details = parseCommandLine("    1     0 root Fri Aug  5 09:01:02 2026 /sbin/launchd", EXECUTABLES);
    assert.equal(details?.started, "Fri Aug 5 09:01:02 2026");
  });

  it("ignores lines it cannot parse", () => {
    assert.equal(parseCommandLine("", EXECUTABLES), null);
    assert.equal(parseCommandLine("not a ps line", EXECUTABLES), null);
    assert.equal(parseCommandLine("    0     0 root Sun Aug 30 17:37:40 2026 /kernel", EXECUTABLES), null);
  });
});
