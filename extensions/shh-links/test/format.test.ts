import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanUrl,
  countUrls,
  formatContent,
  formatLink,
  fromSelection,
  isUrl,
  lengthWarning,
  siteName,
  stripTracking,
  wrapUrls,
} from "../src/format.ts";

const BCHAGAS = "https://www.bchagas.com/projetos/997883/dotfiles";

test("a list of links wraps each one and keeps the blank lines", () => {
  const list = `${BCHAGAS}\n\n${BCHAGAS}\n\n${BCHAGAS}`;
  assert.equal(wrapUrls(list), `<${BCHAGAS}>\n\n<${BCHAGAS}>\n\n<${BCHAGAS}>`);
});

test("text around links is kept as it is", () => {
  assert.equal(
    wrapUrls("look: https://a.com and https://b.com/x?y=1"),
    "look: <https://a.com> and <https://b.com/x?y=1>",
  );
});

test("punctuation after a link stays outside the brackets", () => {
  assert.equal(wrapUrls("see https://a.com/x."), "see <https://a.com/x>.");
  assert.equal(wrapUrls("(see https://a.com/x)"), "(see <https://a.com/x>)");
  assert.equal(wrapUrls("wiki https://x.com/a_(b), ok"), "wiki <https://x.com/a_(b)>, ok");
});

test("links already wrapped or masked are not wrapped twice", () => {
  assert.equal(wrapUrls("<https://a.com>"), "<https://a.com>");
  assert.equal(wrapUrls("[a](<https://a.com>)"), "[a](<https://a.com>)");
  assert.equal(wrapUrls("[a](https://a.com)"), "[a](<https://a.com>)");
});

test("countUrls counts every link in the content", () => {
  assert.equal(countUrls(`${BCHAGAS}\n\n${BCHAGAS}`), 2);
  assert.equal(countUrls("[a](<https://a.com>) https://b.com"), 2);
  assert.equal(countUrls("no links"), 0);
});

test("formatContent uses the text for a single link", () => {
  assert.equal(formatContent("BChagas", BCHAGAS), `[BChagas](<${BCHAGAS}>)`);
  assert.equal(formatContent("", `  ${BCHAGAS}\n`), `<${BCHAGAS}>`);
  assert.equal(formatContent(BCHAGAS, ""), `<${BCHAGAS}>`);
});

test("formatContent wraps every link of a list and ignores the text", () => {
  assert.equal(formatContent("bchagas", `${BCHAGAS}\n\n${BCHAGAS}`), `<${BCHAGAS}>\n\n<${BCHAGAS}>`);
});

test("formatContent gives nothing without a link", () => {
  assert.equal(formatContent("bchagas", "no links here"), undefined);
  assert.equal(formatContent("bchagas", ""), undefined);
});

test("text and url make a masked link", () => {
  assert.equal(formatLink("google", "https://google.com"), "[google](<https://google.com>)");
});

test("no text gives the bare url in angle brackets", () => {
  assert.equal(formatLink("", "https://google.com"), "<https://google.com>");
  assert.equal(formatLink("   ", "https://google.com"), "<https://google.com>");
});

test("a url typed as the text becomes the link", () => {
  assert.equal(formatLink("https://google.com", ""), "<https://google.com>");
});

test("brackets in the text are escaped", () => {
  assert.equal(formatLink("a [b]", "https://x.com"), "[a \\[b\\]](<https://x.com>)");
});

test("an invalid url gives no link", () => {
  assert.equal(formatLink("google", "google.com"), undefined);
  assert.equal(formatLink("google", ""), undefined);
});

test("cleanUrl trims and undoes earlier formatting", () => {
  assert.equal(cleanUrl("  https://google.com\r\n"), "https://google.com");
  assert.equal(cleanUrl("<https://google.com>"), "https://google.com");
  assert.equal(cleanUrl("[bchagas](<https://www.bchagas.com/projetos/1>)"), "https://www.bchagas.com/projetos/1");
  assert.equal(cleanUrl("[a](https://x.com/a_(b))"), "https://x.com/a_(b)");
});

test("cleanUrl drops clipboard text that is not a url", () => {
  assert.equal(cleanUrl("some copied sentence"), "");
  assert.equal(cleanUrl(undefined), "");
});

test("isUrl accepts only http and https", () => {
  assert.ok(isUrl("https://google.com/a?b=1&c=2"));
  assert.ok(isUrl("http://localhost:3000"));
  assert.ok(!isUrl("ftp://x.com"));
  assert.ok(!isUrl("https://has space.com"));
});

test("selected words become the link text", () => {
  assert.deepEqual(fromSelection("bchagas"), { text: "bchagas", urls: "" });
  assert.deepEqual(fromSelection("  meus\ndotfiles  "), { text: "meus dotfiles", urls: "" });
});

test("a selection holding links is the content, not the text", () => {
  assert.deepEqual(fromSelection(` ${BCHAGAS} `), { text: "", urls: BCHAGAS });
  assert.deepEqual(fromSelection(`a ${BCHAGAS}\n${BCHAGAS}`), { text: "", urls: `a ${BCHAGAS}\n${BCHAGAS}` });
});

test("no selection gives nothing", () => {
  assert.deepEqual(fromSelection(""), { text: "", urls: "" });
  assert.deepEqual(fromSelection("   \n "), { text: "", urls: "" });
});

test("siteName is the domain before its suffix, in lowercase", () => {
  assert.equal(siteName("https://www.bchagas.com/projetos/997883"), "bchagas");
  assert.equal(siteName("https://www.exemplo.com.br/produto/1"), "exemplo");
  assert.equal(siteName("https://docs.google.com/document/d/1"), "google");
  assert.equal(siteName("https://bbc.co.uk/news"), "bbc");
  assert.equal(siteName("https://github.com/bchagas/dotfiles"), "github");
  assert.equal(siteName("http://localhost:3000/x"), "localhost");
  assert.equal(siteName("http://192.168.0.1/admin"), "192.168.0.1");
  assert.equal(siteName("not a url"), "");
});

test("named: a single link gets the site name unless a text is given", () => {
  assert.equal(formatContent("", BCHAGAS, { named: true }), `[bchagas](<${BCHAGAS}>)`);
  assert.equal(formatContent("Dotfiles", BCHAGAS, { named: true }), `[Dotfiles](<${BCHAGAS}>)`);
  assert.equal(formatContent("", BCHAGAS), `<${BCHAGAS}>`);
});

test("named: every bare link of a list gets its site name", () => {
  assert.equal(
    formatContent("", `${BCHAGAS}\n\nlook https://github.com/bchagas.`, { named: true }),
    `[bchagas](<${BCHAGAS}>)\n\nlook [github](<https://github.com/bchagas>).`,
  );
});

test("named: links already masked or wrapped keep their form", () => {
  assert.equal(wrapUrls("[a](https://a.com) <https://b.com>", { named: true }), "[a](<https://a.com>) <https://b.com>");
});

test("named: repeated site names are numbered, unique ones are not", () => {
  const list = `${BCHAGAS}\n\nhttps://github.com/bchagas\n\n${BCHAGAS}/2\n${BCHAGAS}/3`;
  assert.equal(
    wrapUrls(list, { named: true }),
    `[bchagas 1](<${BCHAGAS}>)\n\n[github](<https://github.com/bchagas>)\n\n[bchagas 2](<${BCHAGAS}/2>)\n[bchagas 3](<${BCHAGAS}/3>)`,
  );
});

test("named: masked and wrapped links do not count toward the numbering", () => {
  assert.equal(
    wrapUrls(`[a](${BCHAGAS}) <${BCHAGAS}> ${BCHAGAS}`, { named: true }),
    `[a](<${BCHAGAS}>) <${BCHAGAS}> [bchagas](<${BCHAGAS}>)`,
  );
});

test("formatting characters in the text are escaped so Discord shows them as typed", () => {
  assert.equal(formatLink("meu_projeto", BCHAGAS), `[meu\\_projeto](<${BCHAGAS}>)`);
  assert.equal(
    formatLink("**promo** ~x~ `c` ||s||", BCHAGAS),
    "[\\*\\*promo\\*\\* \\~x\\~ \\`c\\` \\|\\|s\\|\\|](<" + BCHAGAS + ">)",
  );
  assert.equal(formatLink("a\\b", BCHAGAS), `[a\\\\b](<${BCHAGAS}>)`);
});

test("stripTracking drops tracking parameters and keeps the rest as written", () => {
  assert.equal(stripTracking("https://a.com/x?utm_source=tw&id=5&fbclid=abc#top"), "https://a.com/x?id=5#top");
  assert.equal(stripTracking("https://a.com/x?utm_source=tw&UTM_MEDIUM=y"), "https://a.com/x");
  assert.equal(stripTracking("https://a.com/x?gclid=1#frag"), "https://a.com/x#frag");
  assert.equal(stripTracking("https://a.com/?q=a%20b&utm_medium=x"), "https://a.com/?q=a%20b");
  assert.equal(stripTracking("https://a.com/x?ref=home&page=2"), "https://a.com/x?ref=home&page=2");
  assert.equal(stripTracking("https://a.com/x"), "https://a.com/x");
});

test("untrack applies to a single link and to every link of a list", () => {
  assert.equal(formatContent("", `${BCHAGAS}?utm_source=x`, { named: true, untrack: true }), `[bchagas](<${BCHAGAS}>)`);
  assert.equal(formatContent("", `${BCHAGAS}?utm_source=x`), `<${BCHAGAS}?utm_source=x>`);
  assert.equal(
    formatContent("", `${BCHAGAS}?fbclid=1\n[a](https://b.com/?gclid=2)`, { untrack: true }),
    `<${BCHAGAS}>\n[a](<https://b.com/>)`,
  );
});

test("lengthWarning flags content over Discord's 2000 characters", () => {
  assert.equal(lengthWarning("a".repeat(2000)), undefined);
  assert.equal(lengthWarning("a".repeat(2345)), "2345 characters: over Discord's 2000 limit (4000 with Nitro)");
});
