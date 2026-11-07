import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveBinary } from "../src/lib/binary";
import { MagpieNotFound } from "../src/lib/errors";

const home = "/Users/me";

test("expands a leading tilde", () => {
  assert.equal(resolveBinary("~/.local/bin/magpie", home), "/Users/me/.local/bin/magpie");
});

test("expands $HOME and ${HOME}", () => {
  assert.equal(resolveBinary("$HOME/.local/bin/magpie", home), "/Users/me/.local/bin/magpie");
  assert.equal(resolveBinary("${HOME}/bin/magpie", home), "/Users/me/bin/magpie");
});

test("expands ${HOME} before the $HOME substring inside it", () => {
  assert.equal(resolveBinary("${HOME}/magpie", home), "/Users/me/magpie");
});

test("leaves other substitutions untouched", () => {
  assert.equal(resolveBinary("$HOME/$(touch /tmp/magpie-pwned)", home), "/Users/me/$(touch /tmp/magpie-pwned)");
  assert.equal(resolveBinary("$HOME/`id`", home), "/Users/me/`id`");
  assert.equal(resolveBinary("/opt/magpie/~", home), "/opt/magpie/~");
});

test("uses the default path when the preference is empty", () => {
  assert.equal(resolveBinary("  ", home), "/Users/me/.local/bin/magpie");
  assert.equal(resolveBinary(undefined, home), "/Users/me/.local/bin/magpie");
});

test("rejects a path that is still relative", () => {
  assert.throws(() => resolveBinary("magpie", home), MagpieNotFound);
});

test("rejects a null byte", () => {
  assert.throws(() => resolveBinary("/tmp/magpie\0", home), MagpieNotFound);
});
