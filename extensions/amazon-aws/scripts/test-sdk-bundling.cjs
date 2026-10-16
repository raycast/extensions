const assert = require("node:assert/strict");
const { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { buildSync } = require("esbuild");

// Store builds bundle package subpaths separately as CommonJS modules. A normal
// single-file development build can hide circular dependencies between them.
const coreRoot = path.dirname(require.resolve("@smithy/core/package.json"));
const core = JSON.parse(readFileSync(path.join(coreRoot, "package.json"), "utf8"));
const directory = mkdtempSync(path.join(tmpdir(), "raycast-aws-sdk-"));
const output = path.join(directory, "node_modules/@smithy/core");
mkdirSync(output, { recursive: true });

try {
  const exports = {};
  for (const [subpath, conditions] of Object.entries(core.exports)) {
    if (subpath === "./package.json") continue;
    const filename = subpath === "." ? "index.js" : `${subpath.slice(2)}.js`;
    exports[subpath] = `./${filename}`;
    buildSync({
      stdin: {
        contents: `import * as entry from ${JSON.stringify(path.join(coreRoot, conditions.module))}; module.exports = entry;`,
        resolveDir: coreRoot,
      },
      outfile: path.join(output, filename),
      bundle: true,
      packages: "external",
      platform: "node",
      format: "cjs",
      minify: true,
    });
  }
  writeFileSync(path.join(output, "package.json"), JSON.stringify({ name: core.name, exports }));

  // Each order needs a fresh module cache. No credentials or AWS requests are used.
  for (const first of ["schema", "protocols", "client"]) {
    const result = spawnSync(
      process.execPath,
      [
        "-e",
        `require('@smithy/core/${first}');
         const { HttpProtocol } = require('@smithy/core/protocols');
         new HttpProtocol({ defaultNamespace: 'com.amazonaws.dynamodb' });`,
      ],
      {
        cwd: directory,
        encoding: "utf8",
        env: { ...process.env, NODE_PATH: path.resolve(__dirname, "../node_modules") },
      },
    );
    const errorStart = result.stderr.lastIndexOf("\nTypeError:");
    const error = errorStart === -1 ? result.stderr : result.stderr.slice(errorStart);
    assert.equal(result.status, 0, `${first}-first initialization failed:\n${error}`);
    console.log(`PASS @smithy/core ${core.version}: ${first}-first initialization`);
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}

const { dependencies } = require("../package.json");
for (const name of Object.keys(dependencies).filter((name) => name.startsWith("@aws-sdk/client-"))) {
  const clients = Object.entries(require(name)).filter(([name]) => name.endsWith("Client"));
  assert.ok(clients.length > 0, `No client exported by ${name}`);
  for (const [, Client] of clients) {
    const client = new Client({
      region: "us-east-1",
      credentials: { accessKeyId: "test", secretAccessKey: "test" },
    });
    client.destroy();
  }
  console.log(`PASS ${name}: client initialization`);
}
