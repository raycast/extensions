import assert from "node:assert/strict";
import test from "node:test";
import {
  parseBinaryFromShellOutput,
  parsePathFromShellOutput,
} from "../src/cli";

test("parseBinaryFromShellOutput ignores shell startup chatter", () => {
  const output = [
    "Welcome back",
    "neofetch output",
    "__AIMEFLUX_BINARY_START__/usr/local/bin/aimeflux",
    "__AIMEFLUX_BINARY_END__",
  ].join("\n");

  assert.equal(parseBinaryFromShellOutput(output), "/usr/local/bin/aimeflux");
});

test("parsePathFromShellOutput ignores shell startup chatter", () => {
  const output = [
    "Loaded profile",
    "__AIMEFLUX_PATH_START__/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin__AIMEFLUX_PATH_END__",
  ].join("\n");

  assert.equal(
    parsePathFromShellOutput(output),
    "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin",
  );
});
