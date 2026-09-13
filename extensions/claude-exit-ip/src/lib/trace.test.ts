import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseTrace } from "./trace";

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL("./__fixtures__/" + name, import.meta.url)), "utf8");

describe("parseTrace", () => {
  it("parses a captured IPv4 trace", () => {
    expect(parseTrace(200, fixture("trace-ok.txt"))).toEqual({
      kind: "ok",
      ip: "203.0.113.9",
      countryCode: "US",
    });
  });

  it("parses an IPv6 trace", () => {
    expect(parseTrace(200, fixture("trace-ok-v6.txt"))).toEqual({
      kind: "ok",
      ip: "2001:db8::1",
      countryCode: "US",
    });
  });

  // Invented fixture: a representative non-2xx challenge page.
  it("reports a non-2xx response as blocked on status", () => {
    expect(parseTrace(403, fixture("trace-challenge-403.html"))).toEqual({
      kind: "blocked",
      status: 403,
      reason: "status",
    });
  });

  // Invented fixture: no captured middlebox returned a valid trace for another host.
  it("rejects a valid-looking trace from the wrong host", () => {
    expect(parseTrace(200, fixture("trace-wrong-host.txt"))).toEqual({
      kind: "blocked",
      status: 200,
      reason: "not-a-trace",
    });
  });

  // Invented fixture: a representative captive-portal login page.
  it("rejects captive-portal HTML", () => {
    expect(parseTrace(200, fixture("trace-captive-portal.html"))).toEqual({
      kind: "blocked",
      status: 200,
      reason: "not-a-trace",
    });
  });
});
