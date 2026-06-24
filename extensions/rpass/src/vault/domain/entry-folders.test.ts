import assert from "node:assert/strict";
import test from "node:test";
import { getEntryParentFolders } from "./entry-folders";

test("gets every parent folder from entry paths", () => {
  assert.deepEqual(
    getEntryParentFolders([
      "example/login",
      "team/example/login.gpg",
      "team/example/admin",
      "demo\\account\\login.gpg",
      "root-entry",
    ]),
    ["demo", "demo/account", "example", "team", "team/example"],
  );
});
