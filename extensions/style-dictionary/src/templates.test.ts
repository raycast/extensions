import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTemplates, renderTemplates } from "./templates.ts";

test("renders project and group templates", () => {
  const templates = parseTemplates('var(--{kebab-name})\n\n@color design.color("{name}")\n@size theme.{camel-name}');
  const token = { path: ["color", "brand", "500"], value: "#f00" };
  assert.deepEqual(renderTemplates(templates, token), ['design.color("brand.500")', "var(--color-brand-500)"]);
});

test("splits camelCase and keeps unknown placeholders", () => {
  const templates = parseTemplates("{snake-name} {camel-name} {path} {value} {nope}");
  const token = { path: ["fontSize", "body-large"], value: "16px" };
  assert.deepEqual(renderTemplates(templates, token), [
    "font_size_body_large fontSizeBodyLarge fontSize.body-large 16px {nope}",
  ]);
});

test("a group template does not apply to the group itself or siblings", () => {
  const templates = parseTemplates("@color.brand x.{name}");
  assert.deepEqual(renderTemplates(templates, { path: ["color", "brand"], value: "" }), []);
  assert.deepEqual(renderTemplates(templates, { path: ["color", "brandX", "1"], value: "" }), []);
});

test("names with leading, trailing, or doubled separators", () => {
  const templates = parseTemplates("{camel-name} {kebab-name}");
  assert.deepEqual(renderTemplates(templates, { path: ["sizing", "--na"], value: "0" }), ["sizingNa sizing-na"]);
  assert.deepEqual(renderTemplates(templates, { path: ["body-", "_x"], value: "" }), ["bodyX body-x"]);
});
