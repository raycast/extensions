import assert from "node:assert/strict";
import { test } from "node:test";
import { fallbackFennPath } from "../src/fenn-installation";

test("an unregistered app can be found in the user's Applications directory", async () => {
  const paths: string[] = [];
  const found = await fallbackFennPath("/Users/example", async (path) => {
    paths.push(path);
    if (path === "/Applications/Fenn.app") throw new Error("missing");
  });
  assert.equal(found, "/Users/example/Applications/Fenn.app");
  assert.deepEqual(paths, ["/Applications/Fenn.app", "/Users/example/Applications/Fenn.app"]);
  assert.equal(
    await fallbackFennPath("/Users/example", async () => {
      throw new Error("missing");
    }),
    null,
  );
});
