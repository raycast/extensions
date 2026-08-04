import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  grpcWebDataFrames,
  grpcWebTrailerFields,
  parseGrokWebBillingResponse,
  primaryWindowLabel,
  validateGrpcWebTrailers,
} from "./parser.ts";

/** Live capture from GetGrokCreditsConfig (credit_usage_percent ≈ 1.0, weekly window). */
const SAMPLE_RESPONSE = Buffer.from(
  "00000000520a500d0000803f12001a00220b08d884c0d20610d8a5e3502a0b08d8f9e4d20610d8a5e3503a070802150000803f421c0802120b08d884c0d20610d8a5e3501a0b08d8f9e4d20610d8a5e350580162006801800000000f677270632d7374617475733a300d0a",
  "hex",
);

describe("grpcWebDataFrames", () => {
  it("extracts the data frame and skips trailers", () => {
    const frames = grpcWebDataFrames(SAMPLE_RESPONSE);
    assert.equal(frames.length, 1);
    assert.equal(frames[0].length, 0x52);
  });
});

describe("validateGrpcWebTrailers", () => {
  it("accepts grpc-status:0", () => {
    assert.doesNotThrow(() => validateGrpcWebTrailers(SAMPLE_RESPONSE));
  });

  it("rejects non-zero grpc-status", () => {
    const bad = Buffer.from("800000000f677270632d7374617475733a310d0a", "hex");
    assert.throws(() => validateGrpcWebTrailers(bad), /gRPC status 1/);
  });
});

describe("grpcWebTrailerFields", () => {
  it("parses unauthenticated trailer status for refresh mapping", () => {
    // flags=0x80, "grpc-status:16\r\n"
    const trailer = Buffer.from("8000000010677270632d7374617475733a31360d0a", "hex");
    const fields = grpcWebTrailerFields(trailer);
    assert.equal(fields["grpc-status"], "16");
  });
});

describe("parseGrokWebBillingResponse", () => {
  it("parses used percent and reset timestamp from a live capture", () => {
    const now = new Date("2026-07-11T12:00:00Z");
    const snapshot = parseGrokWebBillingResponse(SAMPLE_RESPONSE, now);

    assert.ok(Math.abs(snapshot.usedPercent - 1.0) < 0.001);
    assert.ok(snapshot.resetsAt);
    assert.equal(snapshot.resetsAt?.toISOString(), "2026-07-16T20:19:36.000Z");
  });

  it("throws on empty payload", () => {
    assert.throws(() => parseGrokWebBillingResponse(new Uint8Array()), /no protobuf payload/);
  });
});

describe("primaryWindowLabel", () => {
  const now = new Date("2026-07-11T12:00:00Z");

  it("labels ~weekly resets as Weekly", () => {
    const resetsAt = new Date("2026-07-16T20:19:36Z");
    assert.equal(primaryWindowLabel(resetsAt, now), "Weekly");
  });

  it("labels ~monthly resets as Monthly", () => {
    const resetsAt = new Date("2026-08-11T12:00:00Z");
    assert.equal(primaryWindowLabel(resetsAt, now), "Monthly");
  });

  it("falls back to Credits when unknown", () => {
    assert.equal(primaryWindowLabel(null, now), "Credits");
  });
});
