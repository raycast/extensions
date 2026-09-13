import { describe, expect, it } from "vitest";

import { normaliseBaseUrl } from "./url";
import { TargetprocessError } from "./types";

function kindOf(url: string): string | undefined {
  try {
    normaliseBaseUrl(url);
    return undefined;
  } catch (error) {
    return error instanceof TargetprocessError ? error.kind : "unknown";
  }
}

describe("transport security", () => {
  it("accepts https anywhere", () => {
    expect(kindOf("https://acme.tpondemand.com")).toBeUndefined();
    expect(kindOf("https://tools.example.com/TargetProcess")).toBeUndefined();
  });

  it("assumes https when no scheme is given, so the default is safe", () => {
    expect(normaliseBaseUrl("acme.tpondemand.com")).toBe("https://acme.tpondemand.com");
  });

  it("refuses plain http to a public host", () => {
    expect(kindOf("http://acme.tpondemand.com")).toBe("insecure-transport");
    expect(kindOf("http://targetprocess.example.com/tp")).toBe("insecure-transport");
    expect(kindOf("http://8.8.8.8")).toBe("insecure-transport");
  });

  it("explains why, naming the host", () => {
    expect(() => normaliseBaseUrl("http://acme.tpondemand.com")).toThrow(/clear text/);
    expect(() => normaliseBaseUrl("http://acme.tpondemand.com")).toThrow(/acme.tpondemand.com/);
  });

  it("allows http on loopback", () => {
    expect(kindOf("http://localhost:8080")).toBeUndefined();
    expect(kindOf("http://127.0.0.1/tp")).toBeUndefined();
    expect(kindOf("http://[::1]:8080")).toBeUndefined();
  });

  it("allows http on private IPv4 ranges", () => {
    expect(kindOf("http://10.0.0.5/tp")).toBeUndefined();
    expect(kindOf("http://192.168.1.20:8080")).toBeUndefined();
    expect(kindOf("http://172.16.4.4")).toBeUndefined();
    expect(kindOf("http://172.31.255.255")).toBeUndefined();
    expect(kindOf("http://169.254.10.1")).toBeUndefined();
  });

  it("refuses http on public addresses that merely look private", () => {
    expect(kindOf("http://172.15.0.1")).toBe("insecure-transport");
    expect(kindOf("http://172.32.0.1")).toBe("insecure-transport");
    expect(kindOf("http://11.0.0.1")).toBe("insecure-transport");
    expect(kindOf("http://192.169.1.1")).toBe("insecure-transport");
  });

  it("allows http on local-network domain suffixes", () => {
    expect(kindOf("http://tools.corp.local:8080/tp")).toBeUndefined();
    expect(kindOf("http://tp.internal")).toBeUndefined();
    expect(kindOf("http://tp.lan")).toBeUndefined();
    expect(kindOf("http://tp.home.arpa")).toBeUndefined();
  });

  it("allows http on a bare hostname, which only resolves locally", () => {
    expect(kindOf("http://tp-server:8080")).toBeUndefined();
  });

  it("allows http on IPv6 unique-local addresses", () => {
    expect(kindOf("http://[fd00::1]:8080")).toBeUndefined();
    expect(kindOf("http://[fc00::1]")).toBeUndefined();
  });

  it("still rejects a malformed URL as such, not as insecure", () => {
    expect(kindOf("   ")).toBe("not-targetprocess");
    expect(kindOf("http://")).toBe("not-targetprocess");
  });
});
