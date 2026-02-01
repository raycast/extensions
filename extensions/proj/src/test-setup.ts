import { mock } from "bun:test";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const TEST_SUPPORT_PATH = "/tmp/raycast-test-global";

// Ensure test directory exists and has test data
if (!existsSync(TEST_SUPPORT_PATH)) {
  mkdirSync(TEST_SUPPORT_PATH, { recursive: true });
}

// Create a test collection named "work" that search.test.ts expects
const testCollections = [{ id: "work", name: "work", type: "manual" }];
writeFileSync(
  join(TEST_SUPPORT_PATH, "collections.json"),
  JSON.stringify(testCollections),
);

// Mock @raycast/api for tests
mock.module("@raycast/api", () => ({
  Icon: new Proxy(
    {},
    {
      get: (_, prop) => prop,
    },
  ),
  Color: new Proxy(
    {},
    {
      get: (_, prop) => prop,
    },
  ),
  environment: {
    supportPath: TEST_SUPPORT_PATH,
  },
}));
