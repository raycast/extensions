// Serializes every @raycast/icons component (the set ray.so/icon uses) to a static
// { viewBox, body } entry in src/lib/icons.json, so the extension needs no React-DOM at runtime.
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { Icons } = require("@raycast/icons");

const ATTRIBUTE_NAMES = { className: "class", xlinkHref: "xlink:href", xmlnsXlink: "xmlns:xlink" };
const attributeName = (key) => ATTRIBUTE_NAMES[key] ?? key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const escape = (value) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function serialize(node) {
  if (node == null || node === false || node === true) return "";
  if (Array.isArray(node)) return node.map(serialize).join("");
  if (typeof node === "string" || typeof node === "number") return escape(node);
  if (typeof node.type === "function") return serialize(node.type(node.props));
  if (typeof node.type === "object" && node.type.render) return serialize(node.type.render(node.props, null));
  const { children, ...props } = node.props ?? {};
  const attributes = Object.entries(props)
    .filter(([key, value]) => value != null && key !== "ref" && typeof value !== "function")
    .map(([key, value]) => ` ${attributeName(key)}="${escape(value)}"`)
    .join("");
  return `<${node.type}${attributes}>${serialize(children)}</${node.type}>`;
}

const out = {};
for (const [name, Component] of Object.entries(Icons)) {
  const markup = serialize({ type: Component, props: {} });
  const viewBox = markup.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 16 16";
  const body = markup.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  out[name] = { viewBox, body };
}

writeFileSync(new URL("../src/lib/icons.json", import.meta.url), JSON.stringify(out));
console.log(`Wrote ${Object.keys(out).length} icons`);
