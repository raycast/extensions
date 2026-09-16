/**
 * Fixture tests for the app's main-text extractor
 * (.glaze-sources/main/saturn/page-text.ts), bundled with esbuild at test
 * time. Lives here so all Saturn search test infra is in one repo.
 *
 * Run: node test/page-text-fixtures.mjs
 */

import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildSync } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_PAGE_TEXT = path.join(
  os.homedir(),
  "Library/Application Support/app.glaze.macos.main/apps/shelf-local-1v0xag7h/.glaze-sources/main/saturn/page-text.ts",
);

const outFile = path.join(mkdtempSync(path.join(os.tmpdir(), "saturn-pagetext-")), "page-text.mjs");
buildSync({
  entryPoints: [APP_PAGE_TEXT],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: outFile,
  logLevel: "silent",
});
const { extractMainText, finalizeExtractedText, looksLikeLoginWall, MAX_PAGE_TEXT_CHARS } = await import(
  pathToFileURL(outFile).href
);

let failures = 0;
function check(name, cond) {
  if (cond) {
    console.log(`  ok ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name}`);
  }
}

const para = (s) => `<p>${s}</p>`;
const filler = "The quick brown fox jumps over the lazy dog again and again. ";

console.log("content-root preference");
{
  const html = `<html><body>
    <nav><ul><li>Home</li><li>About navigation links galore</li></ul></nav>
    <article><h1>Real Title</h1>${para(filler.repeat(3))}</article>
    <footer>copyright footer boilerplate</footer>
  </body></html>`;
  const out = extractMainText(html);
  check("article text extracted", out?.includes("quick brown fox"));
  check("nav excluded", !out?.includes("Home"));
  check("footer excluded", !out?.includes("copyright"));
}
{
  const html = `<html><body><main>${para("main element content " + filler.repeat(3))}</main></body></html>`;
  check("<main> used when no article", extractMainText(html)?.includes("main element content"));
}
{
  const html = `<html><body><div role="main">${para("role main content " + filler.repeat(3))}</div></body></html>`;
  check("[role=main] used", extractMainText(html)?.includes("role main content"));
}
{
  const html = `<html><body><div>${para("plain body content " + filler.repeat(3))}</div></body></html>`;
  check("body fallback", extractMainText(html)?.includes("plain body content"));
}
{
  // Regression: tiny <article> cards must not beat a content-rich <main>.
  const html = `<html><body>
    <main>${para("the real story " + filler.repeat(4))}</main>
    <article><p>tiny card</p></article>
    <article><p>another card</p></article>
  </body></html>`;
  const out = extractMainText(html);
  check("content-rich <main> beats tiny <article> cards", !!out && out.includes("the real story"));
}
{
  // …and a genuinely article-sized <article> still wins when it has the most text.
  const html = `<html><body>
    <main><p>short intro</p></main>
    <article>${para("long form content " + filler.repeat(4))}</article>
  </body></html>`;
  const out = extractMainText(html);
  check("biggest-text root wins (<article> here)", !!out && out.includes("long form content"));
}

console.log("boilerplate + entities");
{
  const html = `<html><head><style>.x{color:red}</style></head><body>
    <article>${para("visible text " + filler)}<script>var secret = 1;</script>
    <noscript>enable js</noscript></article></body></html>`;
  const out = extractMainText(html);
  check("script content stripped", !out?.includes("secret"));
  check("style content stripped", !out?.includes("color:red"));
  check("noscript stripped", !out?.includes("enable js"));
}
{
  const out = extractMainText(`<article>${para("Fish &amp; Chips &#65; &#x42; &#169; " + filler.repeat(3))}</article>`);
  check("entities decoded", !!out && out.includes("Fish & Chips A B ©"));
}
{
  const out = extractMainText(
    `<article>${para("&ldquo;It&rsquo;s &mdash; &euro;5 &ndash; " + filler.repeat(3))}</article>`,
  );
  check("typographic entities decoded", !!out && out.includes("“It’s — €5 –"));
}
{
  const out = extractMainText(`<article>${para("one")}${para("two")}<br>three ${filler.repeat(2)}</article>`);
  check("block boundaries become newlines", !!out && out.split("\n")[0] === "one" && out.includes("two"));
}

console.log("thin / shell pages");
{
  check("tiny page → undefined", extractMainText("<html><body><p>hi</p></body></html>") === undefined);
  check(
    "JS shell → undefined",
    extractMainText(
      '<html><body><div id="root"></div><script src="/app.js"></script></body></html>',
    ) === undefined,
  );
  check("empty input → undefined", extractMainText("") === undefined);
  const justUnder = `<article>${para("x".repeat(59))}</article>`;
  const justOver = `<article>${para("x".repeat(60))}</article>`;
  check("59 chars → undefined", extractMainText(justUnder) === undefined);
  check("60 chars → text", typeof extractMainText(justOver) === "string");
}

console.log("cap");
{
  const huge = `<article>${para("word ".repeat(20000))}</article>`;
  const out = extractMainText(huge);
  check("capped at MAX_PAGE_TEXT_CHARS", out?.length === MAX_PAGE_TEXT_CHARS);
}

console.log("rendered-text path (finalizeExtractedText)");
{
  const messy = `line one\n\n\n\n   \nline two ${filler.repeat(3)}`;
  const out = finalizeExtractedText(messy);
  check("blank lines collapse", out === `line one\nline two ${filler.repeat(3)}`.trim());
  check("thin rendered text → undefined", finalizeExtractedText("a\nb\nc") === undefined);
}

console.log("login-wall detection (looksLikeLoginWall)");
{
  check(
    "short password form → wall",
    looksLikeLoginWall("Email\n \n \nSend me a one-time password") === true,
  );
  check("sign-in redirect URL → wall", looksLikeLoginWall("", "https://example.com/login?next=/home") === true);
  check("accounts host → wall", looksLikeLoginWall(undefined, "https://accounts.google.com/signin") === true);
  check("empty page, plain URL → not a wall", looksLikeLoginWall("", "https://example.com/") === false);
  check("nothing at all → not a wall", looksLikeLoginWall(undefined, undefined) === false);
  check(
    "long article mentioning sign in → not a wall",
    looksLikeLoginWall(`You may sign in to comment. ${filler.repeat(10)}`) === false,
  );
  check(
    "article URL containing 'login-systems' → not a wall",
    looksLikeLoginWall(undefined, "https://example.com/blog/login-systems") === false,
  );
  check("real micro-site bio → not a wall", looksLikeLoginWall("I built Fey. Now I lead Engineering.", "https://tjruss.com/") === false);
}

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nPASS page-text fixtures");
