import assert from "node:assert/strict";
import test from "node:test";
import {
  addParameter,
  encodeNestedUrl,
  findNestedUrl,
  parseUrl,
  readUrlComponents,
  removeParameter,
  serializeUrl,
  updateParameter,
  updateUrlComponent,
} from "../src/lib/url";

test("unchanged URL round trips without normalizing encoding, repeats, flags, or fragments", () => {
  const original = "https://EXAMPLE.com:443/%7e?tag=one&tag=two&empty=&flag&space=a%20b&plus=a+b&bad=%ZZ&&#/?x=1";
  const parsed = parseUrl(original);
  assert.equal(serializeUrl(parsed), original);
  assert.deepEqual(
    parsed.parameters.slice(0, 4).map(({ key, value }) => [key, value]),
    [
      ["tag", "one"],
      ["tag", "two"],
      ["empty", ""],
      ["flag", ""],
    ],
  );
  assert.equal(parsed.parameters[4].value, "a b");
  assert.equal(parsed.parameters[5].value, "a b");
});

test("edit one repeated parameter while preserving its siblings and unmodified escapes", () => {
  const url = parseUrl("https://example.com?tag=one&tag=two&sig=a%20b#keep");
  const updated = updateParameter(url, url.parameters[1].id, "tag", "三 & +");
  const output = serializeUrl(updated);
  assert.ok(output.startsWith("https://example.com?tag=one&tag="));
  assert.ok(output.endsWith("&sig=a%20b#keep"));
  assert.deepEqual(new URL(output).searchParams.getAll("tag"), ["one", "三 & +"]);
});

test("saving without edits keeps raw encoding", () => {
  const input = "https://example.com?a=a%20b&flag";
  const url = parseUrl(input);
  assert.equal(serializeUrl(updateParameter(url, url.parameters[0].id, "a", "a b")), input);
});

test("adding and deleting parameters preserves empty values and removes an empty query", () => {
  const initial = parseUrl("myapp://page#section");
  const added = addParameter(initial, "new", "");
  assert.equal(serializeUrl(added), "myapp://page?new=#section");
  assert.equal(serializeUrl(removeParameter(added, added.parameters[0].id)), "myapp://page#section");
  assert.equal(serializeUrl(parseUrl("https://example.com?")), "https://example.com?");
});

test("deep URL changes propagate back through three levels and retain extra encoding layers", () => {
  const leaf = "myapp://item?x=1&keep=a%20b";
  const middle = `https://middle.com?target=${encodeURIComponent(encodeURIComponent(leaf))}&tag=one&tag=two`;
  const outer = `https://outer.com?redirect=${encodeURIComponent(middle)}&sig=abc%2fdef`;
  const root = parseUrl(outer);
  const nestedMiddle = findNestedUrl(root.parameters[0].value)!;
  const nestedLeaf = findNestedUrl(nestedMiddle.url.parameters[0].value)!;
  assert.equal(nestedLeaf.encodingLayers, 1);
  const updatedLeaf = updateParameter(nestedLeaf.url, nestedLeaf.url.parameters[0].id, "x", "2 & 三");
  const updatedMiddle = updateParameter(
    nestedMiddle.url,
    nestedMiddle.url.parameters[0].id,
    "target",
    encodeNestedUrl(updatedLeaf, nestedLeaf.encodingLayers),
  );
  const updatedRoot = updateParameter(root, root.parameters[0].id, "redirect", encodeNestedUrl(updatedMiddle, 0));
  const output = serializeUrl(updatedRoot);
  assert.ok(output.endsWith("&sig=abc%2fdef"));
  const middleResult = new URL(new URL(output).searchParams.get("redirect")!);
  assert.deepEqual(middleResult.searchParams.getAll("tag"), ["one", "two"]);
  const leafResult = new URL(decodeURIComponent(middleResult.searchParams.get("target")!));
  assert.equal(leafResult.searchParams.get("x"), "2 & 三");
  assert.equal(leafResult.searchParams.get("keep"), "a b");
});

test("malformed escapes and non-URL strings are not treated as nested URLs", () => {
  assert.equal(findNestedUrl("hello%ZZ"), undefined);
  assert.equal(findNestedUrl("not a url"), undefined);
  assert.throws(() => parseUrl("/relative?x=1"));
  assert.throws(() => parseUrl("https://"));
  assert.equal(findNestedUrl(encodeURIComponent("https://example.com?x=1"))?.encodingLayers, 1);
});

test("URL component inspection retains explicit default ports, case, path escapes, and hash", () => {
  const url = parseUrl("https://u%40name:p%3Ass@EXAMPLE.com:443/%7e?sig=a%20b#foo%20bar");
  assert.deepEqual(readUrlComponents(url), {
    protocol: "https:",
    hostname: "EXAMPLE.com",
    port: "443",
    path: "/%7e",
    fragment: "#foo%20bar",
  });
  for (const [component, value] of Object.entries(readUrlComponents(url))) {
    assert.equal(
      serializeUrl(updateUrlComponent(url, component as keyof ReturnType<typeof readUrlComponents>, value)),
      serializeUrl(url),
    );
  }
});

test("editing protocol, hostname, and port retains credentials and raw query parameters", () => {
  let url = parseUrl("https://u%40name:p%3Ass@EXAMPLE.com:443/%7e?sig=a%20b&tag=1&tag=2#keep");
  url = updateUrlComponent(url, "protocol", "http");
  url = updateUrlComponent(url, "hostname", "[2001:db8::1]");
  url = updateUrlComponent(url, "port", "8080");
  assert.equal(serializeUrl(url), "http://u%40name:p%3Ass@[2001:db8::1]:8080/%7e?sig=a%20b&tag=1&tag=2#keep");
  assert.equal(readUrlComponents(url).port, "8080");
  assert.equal(
    serializeUrl(updateUrlComponent(url, "port", "")),
    "http://u%40name:p%3Ass@[2001:db8::1]/%7e?sig=a%20b&tag=1&tag=2#keep",
  );
});

test("path and fragment changes encode delimiters and Unicode without changing the query", () => {
  const url = parseUrl("https://example.com/old?redirect=https%3a%2f%2fa.com&sig=a%20b#old");
  const updated = updateUrlComponent(updateUrlComponent(url, "path", "/new?x#片"), "fragment", "新的 section");
  const parsed = new URL(serializeUrl(updated));
  assert.equal(parsed.pathname, "/new%3Fx%23%E7%89%87");
  assert.equal(decodeURIComponent(parsed.hash.slice(1)), "新的 section");
  assert.ok(serializeUrl(updated).includes("?redirect=https%3a%2f%2fa.com&sig=a%20b#"));
  assert.equal(updateUrlComponent(updated, "fragment", "").fragment, "");
});

test("component edits work with hierarchical and opaque custom schemes", () => {
  assert.equal(
    serializeUrl(updateUrlComponent(parseUrl("myapp://page/old?x=1"), "path", "new")),
    "myapp://page/new?x=1",
  );
  assert.equal(
    serializeUrl(updateUrlComponent(parseUrl("mailto:old@example.com?subject=test"), "path", "new@example.com")),
    "mailto:new@example.com?subject=test",
  );
  assert.equal(readUrlComponents(parseUrl("file:///Users/example/test.txt")).path, "/Users/example/test.txt");
});

test("invalid components cannot introduce query parameters, fragments, or invalid ports", () => {
  const url = parseUrl("https://example.com/path?x=1");
  for (const port of ["-1", "65536", "abc", "80?x=2"]) assert.throws(() => updateUrlComponent(url, "port", port));
  for (const hostname of ["example.com?x=2", "example.com/path", "user@host", "host:80", ""]) {
    assert.throws(() => updateUrlComponent(url, "hostname", hostname));
  }
  assert.throws(() => updateUrlComponent(url, "protocol", "1http"));
  assert.throws(() => updateUrlComponent(parseUrl("mailto:hello@example.com"), "port", "80"));
});

test("nested URL component edits propagate back with the query and encoding layers intact", () => {
  const inner = "myapp://old.example:8080/old?x=1&keep=a%20b";
  const root = parseUrl(`https://outer.com?redirect=${encodeURIComponent(encodeURIComponent(inner))}&sig=a%2fb`);
  const nested = findNestedUrl(root.parameters[0].value)!;
  let updated = updateUrlComponent(nested.url, "hostname", "new.example");
  updated = updateUrlComponent(updated, "path", "/new/page");
  updated = updateParameter(updated, updated.parameters[0].id, "x", "2");
  const result = updateParameter(
    root,
    root.parameters[0].id,
    "redirect",
    encodeNestedUrl(updated, nested.encodingLayers),
  );
  const output = serializeUrl(result);
  assert.ok(output.endsWith("&sig=a%2fb"));
  assert.equal(
    decodeURIComponent(new URL(output).searchParams.get("redirect")!),
    "myapp://new.example:8080/new/page?x=2&keep=a%20b",
  );
});
