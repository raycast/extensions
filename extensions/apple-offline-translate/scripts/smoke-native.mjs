import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const binary = fileURLToPath(
  new URL("../assets/apple-translate", import.meta.url),
);
function run(request, denyNetwork = false) {
  const args = denyNetwork
    ? ["-p", "(version 1)(allow default)(deny network*)", binary]
    : [];
  const result = spawnSync(
    denyNetwork ? "/usr/bin/sandbox-exec" : binary,
    args,
    {
      input: typeof request === "string" ? request : JSON.stringify(request),
      encoding: "utf8",
      timeout: 60_000,
    },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

const languages = run({ operation: "languages" });
assert.equal(languages.ok, true);
assert.ok(languages.languages.some((item) => item.id === "ru"));
assert.ok(languages.languages.some((item) => item.id === "en"));
assert.equal(run("invalid JSON").code, "invalidRequest");
assert.equal(run({ operation: "delete" }).code, "invalidRequest");
assert.equal(
  run({ operation: "translate", text: " ", source: "en", target: "ru" }).code,
  "emptyText",
);
assert.equal(
  run({
    operation: "translate",
    text: "a".repeat(20_001),
    source: "en",
    target: "ru",
  }).code,
  "inputTooLong",
);
assert.equal(
  run({
    operation: "translate",
    text: "Hello",
    source: "en",
    target: "xx-invalid",
  }).code,
  "unsupportedTarget",
);
const literal =
  "Hello 👋\n$(touch /tmp/no) `code` ![image](https://example.com)";
assert.equal(
  run({ operation: "translate", text: literal, source: "en", target: "en" })
    .text,
  literal,
);
for (const request of [
  {
    operation: "translate",
    text: "Hello! How are you today?",
    source: "auto",
    target: "ru",
  },
  {
    operation: "translate",
    text: "Привет! Как твои дела?",
    source: "auto",
    target: "en",
  },
  {
    operation: "translate",
    text: "Please restart the server.\nThen check the logs.",
    source: "en",
    target: "ru",
  },
]) {
  const reply = run(request, true);
  assert.equal(reply.ok, true, reply.message);
  assert.ok(reply.text.trim());
  assert.notEqual(reply.text, request.text);
  assert.equal(reply.targetLanguage, request.target);
  assert.equal(reply.sourceLanguage, request.target === "ru" ? "en" : "ru");
  console.log(
    `${reply.sourceLanguage} → ${reply.targetLanguage}: ${reply.text}`,
  );
}
console.log(
  "Native checks passed (helper network access denied; macOS translation services run separately).",
);
