const assert = require("node:assert/strict");
const { readFileSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

// Raycast's UI API is supplied by the host and cannot run in Node's test runner.
function loadSource(relativePath) {
  const source = readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true },
  });
  const exports = {};
  const api = { Icon: { Terminal: "terminal", Globe: "globe" }, Color: {} };
  new Function("require", "exports", outputText)((id) => (id === "@raycast/api" ? api : require(id)), exports);
  return exports;
}

const { getRaycastServer } = loadSource("src/registries/builtin/configuration.ts");
const { getAccessories } = loadSource("src/registries/builtin/utils.ts");
const { OFFICIAL_ENTRIES } = loadSource("src/registries/builtin/entries.ts");
const { writeMCPConfig } = loadSource("src/shared/mcp.ts");
const linear = OFFICIAL_ENTRIES.find((entry) => entry.name === "linear");

test("Linear installs directly in Raycast without npx or npm dependencies", () => {
  const server = getRaycastServer(linear);
  assert.equal(server.transport, "sse");
  assert.equal(server.url, "https://mcp.linear.app/mcp");
  assert.equal(server.name, "Linear");
  assert.ok(!("command" in server));
  assert.ok(!("args" in server));
  assert.ok(!("env" in server));
  assert.deepEqual(getAccessories(linear), [{ icon: "globe", tooltip: "HTTP" }]);
});

test("local servers retain their command, arguments and credentials", () => {
  const localEntries = OFFICIAL_ENTRIES.filter((entry) => !entry.remoteUrl);
  assert.ok(localEntries.some((entry) => entry.configuration.env));
  for (const entry of localEntries) {
    const server = getRaycastServer(entry);
    assert.equal(server.transport, "stdio");
    assert.equal(server.command, entry.configuration.command);
    assert.deepEqual(server.args, entry.configuration.args);
    assert.deepEqual(server.env, entry.configuration.env);
    assert.ok(!("url" in server));
  }
});

test("Linear keeps a proxy fallback with the current endpoint for other clients", () => {
  assert.deepEqual(linear.configuration, {
    command: "npx",
    args: ["-y", "mcp-remote", "https://mcp.linear.app/mcp"],
  });
  const directory = mkdtempSync(path.join(tmpdir(), "mcp-registry-test-"));
  const configPath = path.join(directory, "config.json");
  try {
    const existingServer = { command: "example", args: ["existing"] };
    writeFileSync(configPath, JSON.stringify({ theme: "dark", mcpServers: { existing: existingServer } }));
    writeMCPConfig({ config: { path: configPath } }, { mcpServers: { linear: linear.configuration } });
    assert.deepEqual(JSON.parse(readFileSync(configPath, "utf8")), {
      theme: "dark",
      mcpServers: { existing: existingServer, linear: linear.configuration },
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
