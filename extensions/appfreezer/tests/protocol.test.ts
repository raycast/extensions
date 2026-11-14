import { describe, expect, it } from "vitest";
import { actionOutcome, parseSnapshot, ProtocolError } from "../src/protocol";

const validSnapshot = {
  protocolVersion: 4,
  generatedAt: "2026-07-30T12:00:00Z",
  applications: [
    {
      id: "opaque-id",
      name: "Example",
      bundleIdentifier: "com.example.app",
      bundlePath: "/Applications/Example.app",
      cpuPercent: 12.5,
      memoryPercent: 8.25,
      status: "running",
      canPause: true,
      canQuit: true,
    },
  ],
};

describe("parseSnapshot", () => {
  it("parses protocol v4 snapshots", () => {
    const snapshot = parseSnapshot(JSON.stringify(validSnapshot));
    expect(snapshot.applications[0]).toMatchObject({
      id: "opaque-id",
      status: "running",
      cpuPercent: 12.5,
      memoryPercent: 8.25,
    });
  });

  it("rejects invalid JSON", () => {
    expect(() => parseSnapshot("{")).toThrow(ProtocolError);
  });

  it("rejects unknown protocol versions", () => {
    expect(() => parseSnapshot(JSON.stringify({ ...validSnapshot, protocolVersion: 1 }))).toThrow(
      "Unsupported App Freezer protocol version",
    );
  });

  it("rejects unknown application states", () => {
    const applications = [{ ...validSnapshot.applications[0], status: "terminated" }];
    expect(() => parseSnapshot(JSON.stringify({ ...validSnapshot, applications }))).toThrow("unsupported status");
  });

  it("rejects malformed action results instead of treating them as pending", () => {
    expect(() =>
      parseSnapshot(JSON.stringify({ ...validSnapshot, lastAction: { requestID: "id", status: "unknown" } })),
    ).toThrow("invalid action result");
  });
});

describe("actionOutcome", () => {
  it("only accepts a matching request", () => {
    expect(actionOutcome({ requestID: "other", status: "succeeded" }, "wanted")).toBe("pending");
  });

  it("normalizes terminal statuses", () => {
    expect(actionOutcome({ requestID: "id", status: "succeeded" }, "id")).toBe("success");
    expect(actionOutcome({ requestID: "id", status: "failed" }, "id")).toBe("error");
  });
});
