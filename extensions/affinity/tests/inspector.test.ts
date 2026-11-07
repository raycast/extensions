import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { INSPECT_SCRIPT, parseInspection, singleToolArgument, escapeMarkdown } from "../src/lib/inspector";

const fixture = { documents: [{ id: "session", title: "Disposable", path: "", current: true, width: 800, height: 600, dpi: 72, pages: 1, spreads: 1, dirty: false, selectionCount: 0, layers: [{ name: "Rectangle", depth: 0, visible: true, locked: false }], layersLimited: false }] };

test("parses both textual JSON and structured MCP content without trusting malformed fields", () => {
  assert.deepEqual(parseInspection({ content: [{ type: "text", text: JSON.stringify({ result: JSON.stringify(fixture) }) }] }), fixture);
  assert.deepEqual(parseInspection({ structuredContent: fixture }), fixture);
  assert.throws(() => parseInspection({ documents: [{ ...fixture.documents[0], dpi: "72" }] }), /dpi/);
  assert.throws(() => parseInspection({ documents: [{ ...fixture.documents[0], layers: [{ name: "broken" }] }] }), /layer record/);
});

test("script reads SDK document/layer information without changing selections or documents", () => {
  const root = { children: { toArray: () => [{ userDescription: "Rectangle", isVisible: true, isLocked: false, children: { toArray: () => [] } }] } };
  const document = { sessionUuid: "session", title: "Disposable", path: "", widthPixels: 800, heightPixels: 600, dpi: 72, pageCount: 1, spreadCount: 1, isDirty: false, selection: { nodes: { length: 0 } }, rootNode: root, isSameObject: (other: unknown) => other === document };
  const result = vm.runInNewContext(INSPECT_SCRIPT, { require: (name: string) => {
    assert.equal(name, "/document.js");
    return { Document: { current: document, all: [document] } };
  } });
  assert.deepEqual(parseInspection(result), fixture);
  assert.equal(document.selection.nodes.length, 0);
  assert.equal(document.isDirty, false);
});

test("schema discovery accepts the vendor script argument and rejects unknown required inputs", () => {
  assert.deepEqual(singleToolArgument({ name: "execute_script", inputSchema: { properties: { code: {} }, required: ["code"] } }, ["script", "code"], "readonly"), { code: "readonly" });
  assert.throws(() => singleToolArgument({ name: "execute_script", inputSchema: { properties: { code: {}, path: {} }, required: ["path", "code"] } }, ["code"], "x"), /additional arguments/);
  assert.throws(() => singleToolArgument({ name: "execute_script", inputSchema: { properties: {} } }, ["code"], "x"), /unsupported input schema/);
});

test("reports truncation for both nested depth and total node limits", () => {
  type NodeFixture = { userDescription: string; isVisible: boolean; isLocked: boolean; children: { toArray: () => NodeFixture[] } };
  const node = (children: NodeFixture[] = []): NodeFixture => ({ userDescription: "Node", isVisible: true, isLocked: false, children: { toArray: () => children } });
  let chain = node();
  for (let depth = 0; depth < 102; depth++) chain = node([chain]);
  const run = (roots: NodeFixture[]) => {
    const document = { ...fixture.documents[0], sessionUuid: "session", widthPixels: 800, heightPixels: 600, pageCount: 1, spreadCount: 1, isDirty: false, selection: { nodes: { length: 0 } }, rootNode: { children: { toArray: () => roots } }, isSameObject: () => true };
    return parseInspection(vm.runInNewContext(INSPECT_SCRIPT, { require: () => ({ Document: { all: [document], current: document } }) })).documents[0];
  };
  const deep = run([chain]);
  assert.equal(deep.layers.length, 101);
  assert.equal(deep.layersLimited, true);
  assert.equal(run(Array.from({ length: 5001 }, () => node())).layersLimited, true);
  assert.equal(run(Array.from({ length: 5000 }, () => node())).layersLimited, false);
});

test("escapes Markdown errors so local server strings cannot introduce links", () => {
  assert.equal(escapeMarkdown("[link](https://example.com)"), "\\[link\\]\\(https://example\\.com\\)");
});
