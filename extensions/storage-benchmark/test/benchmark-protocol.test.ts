import { describe, expect, it } from "vitest";
import { parseBenchmarkEvent } from "../src/benchmark/protocol";

describe("parseBenchmarkEvent", () => {
  it("parses a completed event from the native helper", () => {
    const event = parseBenchmarkEvent(
      '{"protocolVersion":1,"result":{"confidence":"high","maxBytes":2000000,"measuredBytes":2000000,"methodologyVersion":"sequential-v1","read":{"durationSeconds":1,"megabytesPerSecond":2,"variation":0.02},"write":{"durationSeconds":1,"megabytesPerSecond":2,"variation":0.01}},"type":"completed"}',
    );

    expect(event).toEqual({
      protocolVersion: 1,
      type: "completed",
      result: {
        confidence: "high",
        maxBytes: 2_000_000,
        measuredBytes: 2_000_000,
        methodologyVersion: "sequential-v1",
        read: { durationSeconds: 1, megabytesPerSecond: 2, variation: 0.02 },
        write: { durationSeconds: 1, megabytesPerSecond: 2, variation: 0.01 },
      },
    });
  });

  it("rejects an unsupported protocol version", () => {
    expect(() => parseBenchmarkEvent('{"protocolVersion":2,"type":"started"}')).toThrow(
      "Unsupported helper protocol version: 2",
    );
  });
});
