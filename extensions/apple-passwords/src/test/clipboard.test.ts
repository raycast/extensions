import { strict as assert } from "node:assert";
import { CONCEALED_PASTEBOARD_SCRIPT, copyConcealedToClipboard } from "../clipboard";
import { test } from "./test-harness";

test("marks secret clipboard content as concealed and transient", () => {
  assert.match(CONCEALED_PASTEBOARD_SCRIPT, /org\.nspasteboard\.ConcealedType/);
  assert.match(CONCEALED_PASTEBOARD_SCRIPT, /org\.nspasteboard\.TransientType/);
});

test("reads secret clipboard content from standard input", () => {
  assert.match(CONCEALED_PASTEBOARD_SCRIPT, /fileHandleWithStandardInput/);
});

test("forwards secret content to the concealed clipboard writer", async () => {
  const values: string[] = [];

  await copyConcealedToClipboard("test-secret", async (content) => {
    values.push(content);
  });

  assert.deepEqual(values, ["test-secret"]);
  assert.equal(CONCEALED_PASTEBOARD_SCRIPT.includes("test-secret"), false);
});

test("does not fall back to an ordinary clipboard write when concealment fails", async () => {
  await assert.rejects(
    copyConcealedToClipboard("test-secret", async () => {
      throw new Error("native clipboard failure");
    }),
    /native clipboard failure/,
  );
});
