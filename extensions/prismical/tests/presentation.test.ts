import { strict as assert } from "node:assert";
import { test } from "node:test";
import { appendCapture, folderLabel, previewMarkdown } from "../src/lib/presentation";

test("capture preserves existing text", () => {
  assert.equal(appendCapture("draft", "clipboard"), "draft\n\nclipboard");
  assert.equal(appendCapture("", "selection"), "selection");
});
test("folder labels distinguish nested names and terminate on cycles", () => {
  const folders = [
    { id: "a", name: "Work" },
    { id: "b", name: "Notes", parent_id: "a" },
  ];
  assert.equal(folderLabel(folders[1], folders), "Work / Notes");
  assert.equal(folderLabel({ id: "c", name: "Cycle", parent_id: "c" }, []), "Cycle");
});
test("preview suppresses inline, reference and HTML images while retaining text and links", () => {
  const result = previewMarkdown(
    'Hello **world**\n\n![inline](https://example.com/pixel)\n\n![ref][pic]\n\n[pic]: https://example.com/pixel2\n\n<img src="https://example.com/pixel3">\n\n[Open](https://example.com)',
  );
  assert.doesNotMatch(result, /!\[|<img/);
  assert.match(result, /Hello \*\*world\*\*/);
  assert.match(result, /\[Open\]\(https:\/\/example.com\)/);
});

test("removing block HTML preserves surrounding Markdown blocks", () => {
  const result = previewMarkdown("# Heading\n\nPara one\n\n<div>x</div>\n\n- item\n\nPara two");
  assert.match(result, /^# Heading\n\nPara one\n\n[*-] item\n\nPara two\n$/);
});
test("removing inline HTML preserves paragraph text", () => {
  assert.equal(previewMarkdown("Before <span>inside</span> after."), "Before inside after.\n");
});
test("preview preserves task checkboxes, tables and strikethrough", () => {
  const result = previewMarkdown("- [ ] todo\n- [x] done\n\n~~removed~~\n\n| A | B |\n| - | - |\n| one | two |");
  assert.match(result, /[*-] \[ \] todo/);
  assert.match(result, /[*-] \[x\] done/);
  assert.match(result, /~~removed~~/);
  assert.match(result, /\| A\s*\| B\s*\|/);
});
