import assert from "node:assert/strict";
import { test } from "node:test";
import { urlFromAmbientText, urlFromInput } from "../src/utils/urlText.ts";

test("a typed argument accepts a bare host, a port, and a URL inside longer text", () => {
  assert.equal(urlFromInput("raycast.com"), "raycast.com");
  assert.equal(urlFromInput("  localhost:3000 "), "localhost:3000");
  assert.equal(urlFromInput("see https://example.com/a, then"), "https://example.com/a");
  assert.equal(urlFromInput(""), null);
  assert.equal(urlFromInput("two words"), null);
});

test("a typed word with no dot is not a host, except localhost and IP addresses", () => {
  // `validateUrl` accepts "fart" as https://fart, and the dig then fails as a
  // connection error that never says what was typed.
  assert.equal(urlFromInput("fart"), null);
  assert.equal(urlFromInput("localhost"), "localhost");
  assert.equal(urlFromInput("127.0.0.1:8080"), "127.0.0.1:8080");
  assert.equal(urlFromInput("http://intranet/wiki"), "http://intranet/wiki");
  assert.equal(urlFromInput("raycast.com/store?q=1"), "raycast.com/store?q=1");
});

test("a selection or the clipboard needs something that looks like a URL", () => {
  assert.equal(urlFromAmbientText("https://example.com/path?q=1"), "https://example.com/path?q=1");
  assert.equal(urlFromAmbientText("Read https://example.com/post."), "https://example.com/post");
  assert.equal(urlFromAmbientText("raycast.com"), "raycast.com");
  assert.equal(urlFromAmbientText("www.example.co.uk/docs"), "www.example.co.uk/docs");
  // A lone word is a valid https://word to `validateUrl`; from a clipboard it is not a URL.
  assert.equal(urlFromAmbientText("Overview"), null);
  // Shaped like a host, but no URL parser accepts it: reported as no URL, not dug.
  assert.equal(urlFromAmbientText("example.com:99999"), null);
  assert.equal(urlFromAmbientText("hello world"), null);
  // Local development addresses are copied as often as public ones.
  assert.equal(urlFromAmbientText("localhost:3000"), "localhost:3000");
  assert.equal(urlFromAmbientText("127.0.0.1:8080/admin"), "127.0.0.1:8080/admin");
  assert.equal(urlFromAmbientText(""), null);
});
