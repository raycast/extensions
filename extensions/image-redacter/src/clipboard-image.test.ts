import assert from "node:assert/strict";
import test from "node:test";
import { clipboardFilePath } from "./source-file";

test("converts clipboard file URLs to file-system paths", () => {
  assert.equal(
    clipboardFilePath("file:///tmp/My%20Screenshot.png"),
    "/tmp/My Screenshot.png",
  );
});

test("preserves ordinary clipboard file paths", () => {
  assert.equal(clipboardFilePath("/tmp/Screenshot.png"), "/tmp/Screenshot.png");
});
