import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import {
  assertCanOpen,
  buildADBRemoteCommand,
  decodeEnvironments,
  findUnresolvedVariables,
  resolveDeepLink,
} from "../src/deep-link-utils.js";

test("keeps JavaScript replacement patterns literal", () => {
  const resolved = resolveDeepLink("https://example.test/{{TOKEN}}/${TOKEN}/{{TOKEN}}", { TOKEN: "a$&b$$c" });
  assert.equal(resolved, "https://example.test/a$&b$$c/a$&b$$c/a$&b$$c");
});

test("leaves unknown placeholders unchanged", () => {
  assert.equal(resolveDeepLink("demo://{{KNOWN}}/${UNKNOWN}", { KNOWN: "value" }), "demo://value/${UNKNOWN}");
  assert.deepEqual(findUnresolvedVariables("demo://value/${UNKNOWN}/{{ OTHER }}"), ["UNKNOWN", "OTHER"]);
});

test("rejects unresolved placeholders and malformed URLs with friendly messages", () => {
  assert.throws(() => assertCanOpen("demo://{{TOKEN}}", "Development"), /Configure TOKEN/);
  assert.throws(() => assertCanOpen("not a deep link", "Development"), /malformed/);
  assert.doesNotThrow(() => assertCanOpen("demoapp://products/42", "Development"));
});

test("quotes every adb shell argument so metacharacters stay literal", () => {
  const url = "demoapp://open?first=1&second=$(printf INJECTED)&label=hello world&author=O'Reilly";
  const androidPackage = "com.example.o'hare $(printf PACKAGE) & more";
  const remoteCommand = buildADBRemoteCommand(url, androidPackage);

  assert.deepEqual(parseRemoteShellArguments(remoteCommand), [
    "am",
    "start",
    "-W",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    url,
    "-p",
    androidPackage,
  ]);
});

test("omits the package constraint when it is empty", () => {
  const remoteCommand = buildADBRemoteCommand("demoapp://open?a=1&b=2", "   ");
  assert.deepEqual(parseRemoteShellArguments(remoteCommand), [
    "am",
    "start",
    "-W",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    "demoapp://open?a=1&b=2",
  ]);
});

test("validates and normalizes environment data", () => {
  const environments = decodeEnvironments(
    JSON.stringify([
      {
        id: "105A7E9C-EE8D-4F3D-905A-5D568B2EB382",
        name: "Staging",
        variables: { BASE_URL: "https://staging.example.test" },
      },
    ]),
  );

  assert.deepEqual(
    environments.map((environment) => environment.name),
    ["Development", "Production", "Staging"],
  );
  assert.throws(
    () => decodeEnvironments(JSON.stringify([{ id: "not-a-uuid", name: "Broken", variables: { TOKEN: 42 } }])),
    /invalid format/,
  );
});

test("restores built-in environments without duplicating legacy names or IDs", () => {
  const environments = decodeEnvironments(
    JSON.stringify([
      { id: "105A7E9C-EE8D-4F3D-905A-5D568B2EB382", name: "development" },
      {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Development",
        variables: { STALE: "value" },
      },
    ]),
  );

  assert.deepEqual(
    environments.map((environment) => environment.name),
    ["Development", "Production"],
  );
  assert.deepEqual(environments[0].variables, { STALE: "value" });
});

function parseRemoteShellArguments(command: string): string[] {
  const output = execFileSync("/bin/sh", ["-c", `set -- ${command}; printf '%s\\0' "$@"`]);
  return output.toString().split("\0").slice(0, -1);
}
