import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/components/note-actions.tsx", import.meta.url), "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const mod = { exports: {} };
const element = (type, props) => ({ type, props });
const Action = Object.assign(() => {}, { Push: "Push", OpenInBrowser: "OpenInBrowser", CopyToClipboard: "Copy" });
vm.runInNewContext(js, {
  module: mod,
  exports: mod.exports,
  require: (name) => {
    if (name === "react/jsx-runtime") return { jsx: element, jsxs: element };
    if (name === "@raycast/api")
      return { Action, ActionPanel: { Section: "Section" }, Icon: {}, Keyboard: { Shortcut: { Common: {} } } };
    if (name === "@raycast/utils" || name === "../lib/api") return {};
    if (name === "./note-detail") return { NoteDetail: "NoteDetail" };
    throw new Error(`Unexpected import: ${name}`);
  },
});

for (const current of [undefined, "summary", "transcript"]) {
  const tree = mod.exports.NoteActions({ note: { guid: "test-note", webUrl: "https://tiro.ooo" }, current });
  const actions = tree.props.children.flatMap((section) => [section.props.children].flat().filter(Boolean));
  assert.equal(actions[0].props.shortcut, undefined, `${current}: primary action uses Raycast's shortcut`);
  assert.equal(actions[1].props.shortcut, undefined, `${current}: secondary action uses Raycast's shortcut`);
  const transcript = actions.find((action) => action.props.title === "Show Transcript");
  if (current === undefined) {
    assert.equal(transcript.props.shortcut.key, "t");
    assert.equal(transcript.props.shortcut.modifiers.join(), "cmd");
  } else if (current === "summary") {
    assert.equal(transcript, actions[1]);
  } else {
    assert.equal(transcript, undefined);
  }
}
console.log("3 note-action view cases passed (reserved shortcuts and transcript navigation)");
