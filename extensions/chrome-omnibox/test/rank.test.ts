import { test } from "node:test";
import assert from "node:assert/strict";
import { asUrl, suggest, type Row } from "../src/rank.ts";

const NOW = Date.UTC(2026, 10, 10);
const ago = (days: number) => NOW - days * 86_400_000;
const row = (url: string, title: string, visits: number, daysAgo = 1, typed = 0): Row => ({
  url,
  title,
  visit_count: visits,
  typed_count: typed,
  last_visit_ms: ago(daysAgo),
});

const rows: Row[] = [
  row("https://www.youtube.com/watch?v=abc", "Some video - YouTube", 40),
  row("https://www.youtube.com/", "YouTube", 10),
  row("https://mail.google.com/mail/u/0/#inbox", "Inbox (3) - me@gmail.com - Gmail", 80),
  row("https://t3.chat/chat/123", "T3 Chat", 30),
  row("https://t3.chat/chat/456", "T3 Chat", 20),
  row("https://twitch.tv/somebody", "somebody - Twitch", 5),
  row("https://example.com/rice-recipe", "How to cook rice", 1, 200),
];
const S = "https://www.google.com/search?q=%s";
const first = (q: string) => suggest(q, rows, S, NOW)[0];

test("prefix lands on the site root, not a deep page", () => {
  assert.equal(first("you").url, "https://www.youtube.com/");
  assert.equal(first("t3.ch").url, "https://t3.chat/");
  assert.equal(first("t").kind, "history");
});

test("title word prefix: gm -> Gmail", () => {
  assert.match(first("gm").url, /^https:\/\/mail\.google\.com\//);
});

test("unknown text goes to search first", () => {
  const s = first("how to cook rice");
  assert.equal(s.kind, "search");
  assert.equal(s.url, "https://www.google.com/search?q=how%20to%20cook%20rice");
  assert.equal(first("qwertyzzz").kind, "search");
});

test("unknown domain opens directly", () => {
  assert.deepEqual(first("habr.com"), {
    kind: "url",
    url: "https://habr.com",
    title: "https://habr.com",
    subtitle: "Open address",
  });
});

test("search is always offered right after a strong history hit", () => {
  const list = suggest("you", rows, S, NOW);
  assert.equal(list[1].kind, "search");
});

test("asUrl", () => {
  assert.equal(asUrl("localhost:3000/x"), "http://localhost:3000/x");
  assert.equal(asUrl("https://a.b/c"), "https://a.b/c");
  assert.equal(asUrl("яндекс.рф"), "https://яндекс.рф");
  assert.equal(asUrl("cook rice"), null);
  assert.equal(asUrl("node"), null);
  assert.equal(asUrl("example.com?mode=preview"), "https://example.com?mode=preview");
  assert.equal(asUrl("example.com#section"), "https://example.com#section");
  assert.equal(asUrl("localhost?x=1"), "http://localhost?x=1");
});

test("typed path keeps its case: history /abc does not swallow /ABC", () => {
  const list = suggest("example.com/ABC", [row("https://example.com/abc", "abc", 5)], S, NOW);
  assert.ok(list.some((s) => s.kind === "url" && s.url === "https://example.com/ABC"));
});

test("typed address already in history is not offered twice", () => {
  const list = suggest("EXAMPLE.com/abc", [row("https://example.com/abc", "abc", 5)], S, NOW);
  assert.ok(!list.some((s) => s.kind === "url"));
});
