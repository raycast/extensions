import assert from "node:assert/strict";
import test from "node:test";
import { parseSsdpResponse } from "../src/lib/discovery";

function reply(location = "http://192.168.1.40:8060/", target = "roku:ecp") {
  return `HTTP/1.1 200 OK\r\nLoCaTiOn: ${location}\r\nsT: ${target}\r\nUSN: uuid:roku:ecp:000ABCD\r\n\r\n`;
}

test("SSDP response headers are case insensitive and preserve stable device IDs", () => {
  assert.deepEqual(parseSsdpResponse(reply()), { host: "192.168.1.40", id: "000ABCD" });
  assert.deepEqual(parseSsdpResponse(reply().replaceAll("\r\n", "\n")), { host: "192.168.1.40", id: "000ABCD" });
});

test("only Roku ECP HTTP endpoints on port 8060 are accepted", () => {
  for (const location of [
    "https://192.168.1.40:8060/",
    "http://192.168.1.40:80/",
    "http://user:password@192.168.1.40:8060/",
    "http://example.com:8060/",
    "http://192.168.1.40:8060/keypress/Home",
    "http://192.168.1.40:8060/?command=Home",
    "http://192.168.1.40:8060/#x",
    "file:///tmp/roku",
    "broken",
  ])
    assert.equal(parseSsdpResponse(reply(location)), undefined, location);
  assert.equal(parseSsdpResponse(reply(undefined, "ssdp:all")), undefined);
  assert.equal(parseSsdpResponse(reply().replace("200 OK", "404 Not Found")), undefined);
  assert.equal(parseSsdpResponse("NOTIFY * HTTP/1.1\r\n"), undefined);
});

test("invalid and oversized discovery packets are discarded", () => {
  assert.equal(parseSsdpResponse(""), undefined);
  assert.equal(parseSsdpResponse(reply() + "x".repeat(16_384)), undefined);
  assert.equal(parseSsdpResponse("HTTP/1.1 200 OK\r\nST: roku:ecp\r\n"), undefined);
});
