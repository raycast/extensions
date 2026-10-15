import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

function elements(file: string) {
  const source = ts.createSourceFile(
    file,
    readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found: ts.JsxElement[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxElement(node)) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}

function title(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement) {
  const property = node.attributes.properties.find(
    (attribute) =>
      ts.isJsxAttribute(attribute) && attribute.name.getText() === "title",
  );
  return property &&
    ts.isJsxAttribute(property) &&
    property.initializer &&
    ts.isStringLiteral(property.initializer)
    ? property.initializer.text
    : undefined;
}

function actionTitles(section: ts.JsxElement) {
  return section.children.flatMap((child) => {
    const opening = ts.isJsxElement(child)
      ? child.openingElement
      : ts.isJsxSelfClosingElement(child)
        ? child
        : undefined;
    return opening ? [title(opening)] : [];
  });
}

test("capture sections retain primary actions and group related controls", () => {
  const sections = elements("capture.tsx").filter(
    (node) => node.openingElement.tagName.getText() === "ActionPanel.Section",
  );
  expect(sections.map((node) => title(node.openingElement))).toEqual([
    "Explore",
    "Open",
    "Copy",
    "Results",
  ]);
  expect(actionTitles(sections[0])).toEqual([
    "Inspect Moment",
    "Explore Around This Moment…",
  ]);
  expect(actionTitles(sections[2])).toEqual([
    "Copy Evidence",
    "Copy OCR Text",
    "Copy Screenshot",
    "Copy Frame ID",
  ]);
});

test("saved-search primary actions precede a separate destructive section", () => {
  const sections = elements("saved-searches.tsx").filter(
    (node) => node.openingElement.tagName.getText() === "ActionPanel.Section",
  );
  expect(sections).toHaveLength(2);
  expect(actionTitles(sections[0])).toEqual([
    "Run Saved Search",
    "Edit Saved Search…",
  ]);
  expect(actionTitles(sections[1])).toEqual(["Delete Saved Search"]);
});
