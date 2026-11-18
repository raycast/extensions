import { describe, expect, it } from "vitest";
import { containerArgs } from "./docker";
import { loopbackPort } from "./endpoint";
import { CONTAINER_PORT } from "./image";

describe("loopback port", () => {
  it("reads the port the preference actually names", () => {
    expect(loopbackPort("http://127.0.0.1:5002")).toBe(CONTAINER_PORT);
    expect(loopbackPort("http://127.0.0.1:5003")).toBe(5003);
  });

  it("tolerates a trailing slash, which the probe strips anyway", () => {
    expect(loopbackPort("http://127.0.0.1:5002/")).toBe(5002);
  });

  it("reads an implicit port 80", () => {
    expect(loopbackPort("http://127.0.0.1")).toBe(80);
  });
});

// Each of these describes something the managed container does not serve.
// Accepting one starts a container and then polls an address it never bound,
// which reports a failure for a detector that is running perfectly.
describe("endpoints the managed container cannot serve", () => {
  const rejected: Array<[string, string]> = [
    ["HTTPS, since uvicorn runs without TLS", "https://127.0.0.1:5002"],
    ["IPv6 loopback, which -p does not bind", "http://[::1]:5002"],
    [
      "localhost, whose resolution is not ours to predict",
      "http://localhost:5002",
    ],
    [
      "a path, which the probe would append /health to",
      "http://127.0.0.1:5002/api",
    ],
    ["a query string", "http://127.0.0.1:5002?x=1"],
    ["a fragment", "http://127.0.0.1:5002#x"],
    ["embedded credentials", "http://user:pw@127.0.0.1:5002"],
    ["another loopback address", "http://127.0.0.2:5002"],
    ["a remote host", "http://detector.internal:5002"],
    ["a private address", "http://192.168.1.20:5002"],
    ["a port out of range", "http://127.0.0.1:70000"],
    ["a port fetch refuses outright", "http://127.0.0.1:6000"],
    ["a bare question mark, which swallows /health", "http://127.0.0.1:5002?"],
    ["a bare hash, which swallows /health", "http://127.0.0.1:5002#"],
    ["port zero", "http://127.0.0.1:0"],
    ["a string that is not a URL", "127.0.0.1:5002"],
    ["another scheme entirely", "file:///tmp/detector"],
    ["nothing at all", ""],
  ];

  for (const [reason, url] of rejected) {
    it(`rejects ${reason}`, () => {
      expect(loopbackPort(url)).toBeNull();
    });
  }
});

// The accepted set and the address the container binds have drifted apart once
// already, in both directions. This ties them together.
describe("what is accepted is what gets bound", () => {
  for (const url of [
    "http://127.0.0.1:5002",
    "http://127.0.0.1:5003/",
    "http://127.0.0.1",
  ]) {
    it(`binds exactly the host and port of ${url}`, () => {
      const port = loopbackPort(url);
      expect(port).not.toBeNull();

      // Compared field by field: URL drops an implicit 80 from origin.
      const parsed = new URL(url);
      expect(parsed.hostname).toBe("127.0.0.1");
      expect(parsed.port === "" ? 80 : Number(parsed.port)).toBe(port);

      const args = containerArgs("/tmp/gliner_layer.py", port as number);
      expect(args[args.indexOf("-p") + 1]).toBe(
        `127.0.0.1:${port}:${CONTAINER_PORT}`,
      );
    });
  }
});
