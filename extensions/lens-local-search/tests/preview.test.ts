import assert from "node:assert/strict";
import { test } from "node:test";
import { escapeMarkdown, previewText } from "../src/preview.ts";

test("plain text retains its content", () => {
  assert.equal(previewText("Notes about the glass\nNo remote content", "doc"), "Notes about the glass\nNo remote content");
});

test("document markup cannot create remote images or HTML", () => {
  const text = "![private](https://example.com/track)\n<img src='https://example.com/track'>";
  const result = previewText(text, "doc");
  assert.ok(result.startsWith("\\!\\[private\\]\\("));
  assert.ok(result.includes("\\<img"));
  assert.equal(escapeMarkdown("[a](b).md"), "\\[a\\]\\(b\\)\\.md");
});

test("backticks in source cannot end the code preview fence", () => {
  const text = "`````\n![private](https://example.com/track)\n`````";
  assert.equal(previewText(text, "code"), "``````\n" + text + "\n``````");
});

test("matched words are highlighted in the hint and actual text; unrelated markers are not claimed", () => {
 const marked=previewText('The transaction was retried.','doc','The «transaction» was retried.');
 assert.match(marked,/### Matched words/);assert.equal((marked.match(/\*\*transaction\*\*/g)??[]).length,2);
 const semantic=previewText('A different but related passage.','doc','The «invoice» was paid.');
 assert.match(semantic,/### Related passage/);assert.doesNotMatch(semantic,/\*\*invoice\*\*/);
});
test("hints escape active markup and maths, preserve code fences, and show the matching window", () => {
 const text='boring '.repeat(2200)+'needle $9 ![image](https://example.com/track)';
 const preview=previewText(text,'doc','found «needle»');
 assert.match(preview,/\*\*needle\*\*/);assert.ok(preview.includes('\\$9'));assert.ok(preview.length<13000);
 const code=previewText('const needle = `value`;','code','«needle»');
 assert.match(code,/### Matched words/);assert.match(code,/```\nconst needle/);
 assert.ok(previewText('$😀$ is literal','doc').includes('\\$😀\\$'));
});

test('PDF hints verify literal words against the actual selected page',async()=>{
 const {previewHint}=await import('../src/preview.ts');
 assert.match(previewHint('Exam regulations allow no notes.','«Exam» regulations'),/\*\*Exam\*\*/);
 assert.doesNotMatch(previewHint('An unrelated page.','«Exam» regulations'),/\*\*Exam\*\*/);
 assert.equal(previewHint('text without an excerpt'), '');
});
