import test from "node:test";
import assert from "node:assert/strict";
import { WorkspaceNavigation } from "../src/core/workspaceNavigation";
import { readDocument, JsonDocument } from "../src/core/document";

test("document replacement waits for every old route to finish popping", () => {
  const accepted: JsonDocument[] = [];
  const navigation = new WorkspaceNavigation((document) => accepted.push(document));
  const array = navigation.addRoute();
  const object = navigation.addRoute();
  const editor = navigation.addRoute();
  const next = readDocument('{"new":true}', "Manual Input");
  assert.ok(next.ok);
  navigation.replace(next.document);
  assert.equal(accepted.length, 0);
  assert.equal(navigation.shouldPop(editor), true);
  assert.equal(navigation.shouldPop(object), false);
  navigation.didPop(editor);
  assert.equal(navigation.shouldPop(object), true);
  navigation.didPop(object);
  assert.equal(navigation.shouldPop(array), true);
  assert.equal(accepted.length, 0);
  navigation.didPop(array);
  assert.deepEqual(accepted, [next.document]);
  assert.equal(navigation.shouldPop(array), false);
});

test("ordinary back navigation does not replace a document or pop its parent", () => {
  const navigation = new WorkspaceNavigation(() => assert.fail("Back must not replace the document"));
  const parent = navigation.addRoute();
  const child = navigation.addRoute();
  navigation.didPop(child);
  assert.equal(navigation.shouldPop(parent), false);
});
