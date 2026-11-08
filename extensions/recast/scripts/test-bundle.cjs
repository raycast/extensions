// Exercise the generated artifacts, including Raycast's shared SDK packages.
// A successful TypeScript build alone did not catch the old Smithy bundling bug.
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const path = require("node:path");
const Module = require("node:module");
const root = path.resolve(__dirname, "../dist");
const builtRequire = createRequire(path.join(root, "package.json"));
const originalLoad = Module._load;
Module._load = function (id, ...args) {
  return id === "@raycast/api" ? {} : originalLoad.call(this, id, ...args);
};
try {
  for (const name of [
    "rewrite-selected",
    "rewrite-with-tone",
    "rewrite-with-instruction",
  ]) {
    assert.equal(typeof builtRequire(`./${name}.js`).default, "function");
  }
  const { BedrockRuntimeClient, ConverseStreamCommand } = builtRequire(
    "@aws-sdk/client-bedrock-runtime",
  );
  const client = new BedrockRuntimeClient({
    region: "us-east-1",
    credentials: { accessKeyId: "bundle-test", secretAccessKey: "bundle-test" },
    requestHandler: {
      handle: async () => {
        throw new Error("Bundle request reached transport");
      },
    },
    maxAttempts: 1,
  });
  (async () => {
    try {
      // Resolve credentials, endpoint, auth, middleware, and serialization without
      // sending a network request or requiring real AWS credentials.
      await assert.rejects(
        client.send(
          new ConverseStreamCommand({
            modelId: "global.anthropic.claude-haiku-5-5",
            messages: [{ role: "user", content: [{ text: "Bundle test" }] }],
            inferenceConfig: { maxTokens: 10 },
          }),
        ),
        /Bundle request reached transport/,
      );
      console.log(
        "Production bundle: all three commands load and the AWS SDK reaches transport.",
      );
    } finally {
      client.destroy();
    }
  })().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} finally {
  Module._load = originalLoad;
}
