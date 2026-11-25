import assert from "node:assert/strict";
import { test } from "node:test";
import ts from "typescript";
import { getIcon, searchIcons, toJsx } from "../src/api";

test("JSX preserves artwork values, references, accessibility attributes and styles", () => {
  const output = toJsx(
    '<svg viewBox="0 0 24 24" aria-label="brand-icon"><defs><linearGradient id="brand-gradient"/></defs><path class="brand-mark" fill="url(#brand-gradient)" font-family="sans-serif" stroke-width="2" style="fill-rule:evenodd;stroke-linecap:round"/><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#brand-mark"/></svg>',
    "3m",
  );
  assert.match(output, /function _3mIcon/);
  assert.match(output, /fontFamily="sans-serif"/);
  assert.match(output, /id="brand-gradient"/);
  assert.match(output, /fill="url\(#brand-gradient\)"/);
  assert.match(output, /className="brand-mark"/);
  assert.match(output, /aria-label="brand-icon"/);
  assert.match(output, /strokeWidth/);
  assert.match(output, /fillRule: "evenodd"/);
  assert.match(output, /xlinkHref="#brand-mark"/);
  assert.match(output, /\.\.\.props/);
  const result = ts.transpileModule(output, {
    fileName: "icon.jsx",
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, allowJs: true },
    reportDiagnostics: true,
  });
  assert.deepEqual(result.diagnostics, []);
});

test("catalog and SVG failures propagate and failed catalog requests can be retried", async () => {
  const originalFetch = globalThis.fetch;
  let failRegistry = true;
  globalThis.fetch = async (input) => {
    if (String(input).endsWith("icons-full.json")) {
      if (failRegistry) return new Response("Unavailable", { status: 503 });
      return Response.json([
        {
          slug: "github",
          title: "GitHub",
          aliases: [],
          categories: ["Development"],
          hex: "181717",
          url: null,
          variants: { default: "/icons/github/default.svg" },
        },
        {
          slug: "apple",
          title: "Apple",
          aliases: [],
          categories: ["Technology"],
          hex: "000000",
          url: null,
          variants: { default: "/icons/apple/default.svg" },
        },
      ]);
    }
    return new Response("Unavailable", { status: 503 });
  };
  try {
    await assert.rejects(searchIcons("github"), /503/);
    failRegistry = false;
    const result = await searchIcons("github");
    assert.equal(result.total, 1);
    assert.equal(result.icons[0].slug, "github");
    await assert.rejects(getIcon("github"), /Could not fetch SVG: 503/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
