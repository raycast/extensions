import { describe, expect, it } from "vitest";
import { facetsOf, subtitleFormOf } from "./convention";
import { moveEnvironmentToSubtitle } from "./move-environment";
import { parseScriptCommand } from "./parse-script-command";

const script = (header: string[]) =>
  [
    "#!/usr/bin/env zsh",
    "",
    "# Required parameters:",
    "# @raycast.schemaVersion 1",
    ...header,
    "# @raycast.mode silent",
    "",
    "# Optional parameters:",
    "# @raycast.icon ./assets/linear/index.png",
    "",
    'open "https://linear.app/acme/team/ENG/active"',
    "",
  ].join("\n");

const reparse = (contents: string) =>
  parseScriptCommand({ path: "/tmp/linear.sprint-board.sh", body: contents, isExecutable: true });

describe("subtitleFormOf", () => {
  it("moves the scope onto the subtitle, after the brand", () => {
    expect(subtitleFormOf({ title: "@work · Sprint Board", packageName: "Linear" })).toEqual({
      title: "Sprint Board",
      packageName: "Linear · @work",
    });
  });

  it("has nothing to move for a title already in the current form", () => {
    expect(subtitleFormOf({ title: "Sprint Board", packageName: "Linear · @work" })).toBeUndefined();
  });
});

describe("moveEnvironmentToSubtitle", () => {
  it("rewrites both header lines and nothing else", () => {
    const before = script(["# @raycast.title @work · Sprint Board", "# @raycast.packageName Linear"]);
    const after = moveEnvironmentToSubtitle(before);

    expect(after).toBe(script(["# @raycast.title Sprint Board", "# @raycast.packageName Linear · @work"]));
  });

  it("writes the category after the scope, in the order the create form uses", () => {
    const before = script(["# @raycast.title @work · Sprint Board", "# @raycast.packageName Linear · #dev"]);

    expect(moveEnvironmentToSubtitle(before)).toBe(
      script(["# @raycast.title Sprint Board", "# @raycast.packageName Linear · @work · #dev"]),
    );
  });

  it("adds a subtitle beside the title when the command has none", () => {
    const before = script(["# @raycast.title @work · Sprint Board"]);

    expect(moveEnvironmentToSubtitle(before)).toBe(
      script(["# @raycast.title Sprint Board", "# @raycast.packageName @work"]),
    );
  });

  it("keeps the file's own comment marker and line endings", () => {
    const before = "// @raycast.schemaVersion 1\r\n// @raycast.title @home · Inbox\r\n// @raycast.packageName Mail\r\n";

    expect(moveEnvironmentToSubtitle(before)).toBe(
      "// @raycast.schemaVersion 1\r\n// @raycast.title Inbox\r\n// @raycast.packageName Mail · @home\r\n",
    );
  });

  it("is a no-op the second time round", () => {
    const once = moveEnvironmentToSubtitle(
      script(["# @raycast.title @work · Sprint Board", "# @raycast.packageName Linear · #dev"]),
    );

    expect(moveEnvironmentToSubtitle(once)).toBe(once);
  });

  it("leaves a command with no scope on its title untouched", () => {
    const current = script(["# @raycast.title Sprint Board", "# @raycast.packageName Linear · @work"]);

    expect(moveEnvironmentToSubtitle(current)).toBe(current);
  });

  it("reads back as the same command it was", () => {
    const before = script(["# @raycast.title @work · Sprint Board", "# @raycast.packageName Linear · #dev"]);
    const original = reparse(before);
    const migrated = reparse(moveEnvironmentToSubtitle(before));

    expect(original && migrated && facetsOf(migrated)).toEqual(original && facetsOf(original));
  });
});
