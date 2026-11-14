import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeClaudeProjectPathLossy,
  encodeClaudeProjectPath,
  expandHomePath,
  extractClaudeSessionCwd,
  getClaudeConfigDirectory,
  getPathIdentity,
  getVSCodeStoragePaths,
  matchesClaudeProjectDirectory,
  validateClaudeSessionCwd,
  parseFileUri,
} from "../src/lib/platform.ts";

test("expands both Windows and macOS home prefixes", () => {
  assert.equal(
    expandHomePath("~/repo", "/Users/me", "darwin"),
    "/Users/me/repo",
  );
  assert.equal(
    expandHomePath("~\\repo", "C:\\Users\\Me", "win32"),
    "C:\\Users\\Me\\repo",
  );
});

test("normalizes Windows path identity without changing display paths", () => {
  assert.equal(
    getPathIdentity("C:\\Users\\Me\\..\\ME\\Repo", "win32"),
    "c:\\users\\me\\repo",
  );
});

test("encodes and decodes native Windows Claude project paths", () => {
  const original = "C:\\Users\\lucaz\\Documents\\Agent_Finance.v2";
  const encoded = encodeClaudeProjectPath(original);
  assert.equal(encoded, "C--Users-lucaz-Documents-Agent-Finance-v2");
  assert.equal(
    decodeClaudeProjectPathLossy(
      "C--Users-lucaz-Documents-Agent-Finance",
      "win32",
    ),
    "C:\\Users\\lucaz\\Documents\\Agent\\Finance",
  );
});

test("encodes Windows spaces and special characters with Claude's slug rule", () => {
  assert.equal(
    encodeClaudeProjectPath("D:\\OneDrive - Insight Systems\\Repo & Tools"),
    "D--OneDrive---Insight-Systems-Repo---Tools",
  );
  assert.equal(
    encodeClaudeProjectPath("C:\\开发\\Repo (v2)"),
    "C-----Repo--v2-",
  );
  assert.equal(
    matchesClaudeProjectDirectory(
      "C:\\dev\\old_name",
      "C--dev-old_name",
      "win32",
    ),
    true,
  );
  const longPath = `C:\\${"nested-".repeat(40)}repo`;
  const longEncoded = encodeClaudeProjectPath(longPath);
  assert.equal(
    matchesClaudeProjectDirectory(
      longPath,
      `${longEncoded.slice(0, 200)}-abc123`,
      "win32",
    ),
    true,
  );
});

test("honors a configured Claude directory", () => {
  assert.equal(
    getClaudeConfigDirectory(
      "C:\\Users\\Me",
      { CLAUDE_CONFIG_DIR: "~\\Claude Data" },
      undefined,
      "win32",
    ),
    "C:\\Users\\Me\\Claude Data",
  );
});

test("builds Windows editor storage paths from AppData", () => {
  const paths = getVSCodeStoragePaths(
    "C:\\Users\\Me",
    { APPDATA: "D:\\Profiles\\Me\\Roaming" },
    "win32",
  );
  assert.equal(
    paths[0],
    "D:\\Profiles\\Me\\Roaming\\Code\\User\\globalStorage\\storage.json",
  );
  assert.equal(paths.length, 4);
});

test("parses Windows drive and UNC file URIs", () => {
  assert.equal(
    parseFileUri("file:///C:/Users/Me/My%20Repo", "win32"),
    "C:\\Users\\Me\\My Repo",
  );
  assert.equal(
    parseFileUri("file://server/share/My%20Repo", "win32"),
    "\\\\server\\share\\My Repo",
  );
});

test("extracts only a matching absolute cwd from a Windows transcript", () => {
  const head = [
    "not json",
    JSON.stringify({ cwd: "relative\\repo", type: "user" }),
    JSON.stringify({ cwd: "C:\\Users\\Me\\Wrong", type: "user" }),
    JSON.stringify({ cwd: "C:\\Users\\Me\\Agent_Finance", type: "user" }),
  ].join("\r\n");

  assert.equal(
    extractClaudeSessionCwd(head, "C--Users-Me-Agent-Finance", "win32"),
    "C:\\Users\\Me\\Agent_Finance",
  );
  assert.equal(
    extractClaudeSessionCwd(head, "C--Users-Me-Another", "win32"),
    null,
  );
});

test("validates transcript cwd against its encoded project directory", () => {
  assert.equal(
    validateClaudeSessionCwd(
      "/Users/a.b/helm-charts/my_service",
      "-Users-a-b-helm-charts-my-service",
      "darwin",
    ),
    "/Users/a.b/helm-charts/my_service",
  );
  assert.equal(
    validateClaudeSessionCwd(
      "/Users/a.b/wrong-project",
      "-Users-a-b-helm-charts-my-service",
      "darwin",
    ),
    null,
  );
});
