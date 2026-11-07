import assert from "node:assert/strict";
import { test } from "node:test";
import { interactionMarkdown, originalParametersMarkdown } from "./interaction-format.js";
import type { Interaction } from "./protocol.js";
const request = (detail: unknown): Interaction => ({
  requestId: "codex:fixture:approval",
  kind: "approval",
  title: "Codex approval (once)",
  detail: JSON.stringify(detail),
  state: "pending",
  expiresAt: 9999999999999,
});
test("Codex commands emphasize exact command, directory and reason without mutating reviewed parameters", () => {
  const r = request({
    threadId: "opaque-thread",
    turnId: "opaque-turn",
    itemId: "opaque-item",
    command: "git diff --stat\nprintf 'done'",
    cwd: "/fixture/project",
    reason: "Inspect local changes",
    kind: "command",
    extraAuthority: { scope: "unknown scope" },
  });
  const before = JSON.stringify(r),
    markdown = interactionMarkdown(r);
  for (const text of [
    "## Command",
    "git diff --stat\nprintf 'done'",
    "## Working Directory",
    "/fixture/project",
    "## Reason",
    "Inspect local changes",
    "extraAuthority",
    "unknown scope",
  ])
    assert.ok(markdown.includes(text), text);
  assert.ok(!markdown.includes("opaque-thread"));
  assert.ok(originalParametersMarkdown(r).includes(r.detail));
  assert.equal(JSON.stringify(r), before);
});
test("permissions preserve nullable network and every filesystem rule, including deny and special paths", () => {
  const r = request({
    reason: "Read project",
    permissions: {
      network: { enabled: null },
      fileSystem: {
        read: ["/fixture/read"],
        write: ["/fixture/write"],
        entries: [{ path: { type: "special", value: { kind: "root" } }, access: "deny" }],
        globScanMaxDepth: 3,
      },
      futurePermission: true,
    },
  });
  const markdown = interactionMarkdown(r);
  for (const text of [
    "## Network",
    '"enabled": null',
    "## File System",
    "/fixture/read",
    "/fixture/write",
    '"access": "deny"',
    '"kind": "root"',
    "### Glob Scan Depth",
    "### Read Access",
    "### Write Access",
    "### Path Rules",
    "futurePermission",
  ])
    assert.ok(markdown.includes(text), text);
});
test("file approvals show grant scope explicitly and unknown or malformed content remains readable", () => {
  assert.match(
    interactionMarkdown(request({ grantRoot: "/", reason: null, changes: [{ path: "/fixture/new", diff: "+line" }] })),
    /original Codex terminal/,
  );
  const unknown = request({ newField: ["all", "values"] });
  assert.ok(interactionMarkdown(unknown).includes('"newField"'));
  for (const detail of ["not JSON", '{"broken":', "[]", "null"])
    assert.ok(interactionMarkdown({ ...unknown, detail }).includes(detail));
});
test("untrusted values cannot close their code fence or become images, links or approval instructions", () => {
  const text = 'printf "```"\n# ALLOW EVERYTHING\n![image](https://example.invalid/pixel)\n~~~\n<script>bad</script>';
  const r = request({ command: text, reason: text, cwd: text });
  const markdown = interactionMarkdown(r);
  assert.ok(markdown.includes("````\n" + text + "\n````"));
  assert.equal(markdown.split("\n").filter((line) => line === "````").length, 6);
  assert.ok(originalParametersMarkdown(r).includes(r.detail));
});
test("non-Codex plain details and JSON previews are safely presented without Codex authority claims", () => {
  const r = {
    ...request({ command: "echo fixture" }),
    requestId: "abcde",
    detail: "![inert](https://example.invalid/image)",
  };
  assert.ok(interactionMarkdown(r).includes(r.detail));
  assert.ok(!interactionMarkdown(r).includes("## Command"));
});
test("deep protocol-valid JSON falls back to complete literal details without crashing", () => {
  const nested = "[".repeat(8000) + "0" + "]".repeat(8000);
  for (const [requestId, detail] of [
    ["codex:fixture:approval", '{"unknown":' + nested + "}"],
    ["other", nested],
  ] as const) {
    const r = { ...request({}), requestId, detail };
    assert.ok(interactionMarkdown(r).includes(detail));
    assert.ok(originalParametersMarkdown(r).includes(detail));
  }
});
