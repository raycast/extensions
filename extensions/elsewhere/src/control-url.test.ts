import assert from "node:assert/strict";
import test from "node:test";

import { buildElsewhereUrl } from "./control-url";

test("builds every supported command with correlation", () => {
  const requestId = "raycast_123_request";

  assert.equal(
    buildElsewhereUrl({ kind: "experience", action: "play" }, requestId),
    `elsewhere://play?requestId=${requestId}`,
  );
  assert.equal(
    buildElsewhereUrl({ kind: "experience", action: "pause" }, requestId),
    `elsewhere://pause?requestId=${requestId}`,
  );
  assert.equal(
    buildElsewhereUrl({ kind: "space", action: "select", id: "space-123" }, requestId),
    `elsewhere://space/select?id=space-123&requestId=${requestId}`,
  );
  assert.equal(
    buildElsewhereUrl(
      { kind: "space", action: "create", prompt: "A rainy cabin for deep work" },
      requestId,
      "abcdefghijklmnopqrstuv",
    ),
    `elsewhere://space/create?nonce=abcdefghijklmnopqrstuv&requestId=${requestId}`,
  );
  assert.equal(
    buildElsewhereUrl({ kind: "music", action: "on" }, requestId),
    `elsewhere://music/on?requestId=${requestId}`,
  );
  assert.equal(
    buildElsewhereUrl({ kind: "music", action: "off" }, requestId),
    `elsewhere://music/off?requestId=${requestId}`,
  );
  assert.equal(
    buildElsewhereUrl({ kind: "music", action: "select", id: "quiet-canopy" }, requestId),
    `elsewhere://music/select?id=quiet-canopy&requestId=${requestId}`,
  );
  assert.equal(
    buildElsewhereUrl({ kind: "volume", target: "ambience", value: 40 }, requestId),
    `elsewhere://volume/ambience?value=40&requestId=${requestId}`,
  );
  assert.equal(
    buildElsewhereUrl({ kind: "volume", target: "music", delta: -10 }, requestId),
    `elsewhere://volume/music?delta=-10&requestId=${requestId}`,
  );
  assert.equal(
    buildElsewhereUrl({ kind: "source", action: "disable", id: "src-123" }, requestId),
    `elsewhere://source/disable?id=src-123&requestId=${requestId}`,
  );
  assert.equal(
    buildElsewhereUrl({ kind: "navigation", destination: "main" }, requestId),
    `elsewhere://open?requestId=${requestId}`,
  );
  assert.equal(
    buildElsewhereUrl({ kind: "navigation", destination: "sources" }, requestId),
    `elsewhere://open/sources?requestId=${requestId}`,
  );
  assert.equal(
    buildElsewhereUrl({ kind: "navigation", destination: "settings" }, requestId),
    `elsewhere://open/settings?requestId=${requestId}`,
  );
});

test("encodes identifiers and clamps volume inputs", () => {
  assert.equal(
    buildElsewhereUrl({ kind: "space", action: "select", id: "space & focus" }),
    "elsewhere://space/select?id=space+%26+focus",
  );
  assert.throws(
    () => buildElsewhereUrl({ kind: "space", action: "create", prompt: "Rain & thunder / warm lights" }),
    /private request envelope/,
  );
  assert.equal(
    buildElsewhereUrl({ kind: "volume", target: "ambience", value: 140 }),
    "elsewhere://volume/ambience?value=100",
  );
  assert.equal(buildElsewhereUrl({ kind: "volume", target: "music", value: -20 }), "elsewhere://volume/music?value=0");
  assert.equal(
    buildElsewhereUrl({ kind: "volume", target: "music", delta: 120 }),
    "elsewhere://volume/music?delta=100",
  );
});

test("keeps absolute and relative volume mutually exclusive", () => {
  assert.equal(
    buildElsewhereUrl({ kind: "volume", target: "ambience", value: 55 }),
    "elsewhere://volume/ambience?value=55",
  );
  assert.equal(
    buildElsewhereUrl({ kind: "volume", target: "ambience", delta: 10 }),
    "elsewhere://volume/ambience?delta=10",
  );
  assert.throws(() => buildElsewhereUrl({ kind: "volume", target: "music", value: Number.NaN }), /finite number/);
  assert.throws(
    () => buildElsewhereUrl({ kind: "space", action: "create", prompt: "   " }),
    /Prompt must not be empty/,
  );
  assert.throws(
    () => buildElsewhereUrl({ kind: "space", action: "create", prompt: "a".repeat(1201) }),
    /Prompt must be at most 1200 characters/,
  );
  assert.equal(
    buildElsewhereUrl(
      { kind: "space", action: "create", prompt: "  Rain and thunder  " },
      "raycast_123",
      "abcdefghijklmnopqrstuv",
    ),
    "elsewhere://space/create?nonce=abcdefghijklmnopqrstuv&requestId=raycast_123",
  );
});
