import { describe, expect, it } from "vitest";
import { loopbackPort } from "./endpoint";
import { CONTAINER_PORT } from "./image";

describe("loopback port", () => {
  it("reads the port the preference actually names", () => {
    expect(loopbackPort("http://127.0.0.1:5002")).toBe(CONTAINER_PORT);
    // The bug this guards: the container used to publish on 5002 whatever the
    // preference said, then poll the preference and report a false failure.
    expect(loopbackPort("http://127.0.0.1:6000")).toBe(6000);
  });

  it("accepts the other ways of writing loopback", () => {
    expect(loopbackPort("http://localhost:5002")).toBe(5002);
    expect(loopbackPort("http://[::1]:5002")).toBe(5002);
  });

  it("tolerates a trailing slash and a path", () => {
    expect(loopbackPort("http://127.0.0.1:5002/")).toBe(5002);
  });

  it("falls back to the protocol default when no port is given", () => {
    expect(loopbackPort("http://127.0.0.1")).toBe(80);
    expect(loopbackPort("https://127.0.0.1")).toBe(443);
  });

  it("refuses a host this command cannot start a container for", () => {
    expect(loopbackPort("http://detector.internal:5002")).toBeNull();
    expect(loopbackPort("http://192.168.1.20:5002")).toBeNull();
  });

  it("refuses anything that is not an http URL", () => {
    expect(loopbackPort("")).toBeNull();
    expect(loopbackPort("127.0.0.1:5002")).toBeNull();
    expect(loopbackPort("file:///tmp/detector")).toBeNull();
  });
});
