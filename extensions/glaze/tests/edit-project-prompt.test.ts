import assert from "node:assert/strict";
import { test } from "node:test";
import { editProjectPrompt } from "../src/lib/edit-project-prompt";

test("removes the NTS destination phrase while preserving the actual request", () => {
  assert.equal(
    editProjectPrompt("let's add light mode to my nts app", "to my nts app"),
    "let's add light mode",
  );
  assert.equal(
    editProjectPrompt("let's add light mode to my nts app!", "to my nts app"),
    "let's add light mode!",
  );
});

test("removes leading or inline routing without rewording the changes", () => {
  assert.equal(
    editProjectPrompt(
      "In my NTS app, add light mode\nand keep dark mode",
      "In my NTS app",
    ),
    "add light mode\nand keep dark mode",
  );
  assert.equal(
    editProjectPrompt(
      "Please, in my NTS app, add light mode",
      ", in my NTS app,",
    ),
    "Please add light mode",
  );
  assert.equal(
    editProjectPrompt("Please in my NTS app add light mode", " in my NTS app "),
    "Please add light mode",
  );
  assert.equal(
    editProjectPrompt("NTS: add light mode", "NTS: "),
    "add light mode",
  );
});

test("preserves app names in requested UI text, renaming, and comparisons", () => {
  const changes =
    'rename the title to "NTS" and match the colors of my Notes app';
  assert.equal(
    editProjectPrompt(`In my NTS app, ${changes}`, "In my NTS app, "),
    changes,
  );
  const quoted =
    '  add a button saying "to my nts app"\nkeep the existing layout  ';
  assert.equal(editProjectPrompt(quoted, ""), quoted);
});

test("rejects missing or ambiguous extraction before forwarding anything", () => {
  assert.throws(
    () => editProjectPrompt("add light mode to my NTS app", "to my nts app"),
    /unique, exact substring/,
  );
  assert.throws(
    () =>
      editProjectPrompt(
        'In my NTS app, add the label "In my NTS app"',
        "In my NTS app",
      ),
    /unique, exact substring/,
  );
  assert.throws(
    () => editProjectPrompt("to my nts app", "to my nts app"),
    /entire request/,
  );
});
