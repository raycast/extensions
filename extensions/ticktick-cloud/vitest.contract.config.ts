const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { defineConfig } = require("vitest/config");

// The authenticated contract reads its credentials from the environment. A
// git-ignored .env file beside this config supplies them without ever putting
// the token into shell history or command arguments.
function loadContractEnvironment() {
  let content;
  try {
    content = readFileSync(resolve(__dirname, ".env"), "utf8");
  } catch {
    return;
  }
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}

loadContractEnvironment();

module.exports = defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.contract.test.ts"],
    restoreMocks: true,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
