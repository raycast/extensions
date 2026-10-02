// Run with `npm test`. See lib.test.js for the Node version requirement.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { currentShellHandler } from "../src/macos.ts";

describe("currentShellHandler", () => {
  const shell = (handler, date) => ({
    LSHandlerContentType: "public.unix-executable",
    LSHandlerRoleShell: handler,
    ...(date === undefined ? {} : { LSHandlerModificationDate: date }),
  });

  it("follows the most recently chosen terminal, whatever the record order", () => {
    assert.equal(
      currentShellHandler([shell("com.apple.terminal", 700), shell("com.mitchellh.ghostty", 800)]),
      "com.mitchellh.ghostty",
    );
    assert.equal(
      currentShellHandler([shell("com.mitchellh.ghostty", 800), shell("com.apple.terminal", 700)]),
      "com.mitchellh.ghostty",
    );
  });

  it("prefers a dated record over an undated one", () => {
    assert.equal(
      currentShellHandler([shell("com.apple.terminal"), shell("com.mitchellh.ghostty", 800)]),
      "com.mitchellh.ghostty",
    );
  });

  it("ignores records for other content types and roles", () => {
    const others = [
      { LSHandlerContentType: "public.html", LSHandlerRoleAll: "com.google.chrome" },
      { LSHandlerContentType: "public.unix-executable", LSHandlerRoleAll: "com.apple.finder" },
    ];
    assert.equal(currentShellHandler(others), undefined);
    assert.equal(currentShellHandler([...others, shell("com.mitchellh.ghostty", 800)]), "com.mitchellh.ghostty");
  });

  it("returns undefined for a missing or malformed LSHandlers value", () => {
    assert.equal(currentShellHandler(undefined), undefined);
    assert.equal(currentShellHandler({}), undefined);
    assert.equal(currentShellHandler([null, "not a record"]), undefined);
  });
});
