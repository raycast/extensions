import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  grpcWebDataFrames,
  grpcWebTrailerFields,
  parseGrokResetCreditsResponse,
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

describe("parseGrokResetCreditsResponse", () => {
  /** Live capture from GetRemainingResets: restok_vpYDqo, expires 2026-09-12T18:49:00Z. */
  const SAMPLE_RESET_RESPONSE = Buffer.from(
    "00000000235221520d726573746f6b5f76705944716fa20106089c80f3d306f20106089cbd96d506800000000f677270632d7374617475733a300d0a",
    "hex",
  );

  it("parses available count and expiry from a live capture", () => {
    const now = new Date("2026-08-13T12:00:00Z");
    const snapshot = parseGrokResetCreditsResponse(SAMPLE_RESET_RESPONSE, now);

    assert.equal(snapshot.availableCount, 1);
    assert.deepEqual(snapshot.expiresAtList, ["2026-09-12T18:49:00.000Z"]);
  });

  it("does not count expired tokens as available", () => {
    const afterExpiry = new Date("2026-09-13T00:00:00Z");
    const snapshot = parseGrokResetCreditsResponse(SAMPLE_RESET_RESPONSE, afterExpiry);

    assert.equal(snapshot.availableCount, 0);
    assert.deepEqual(snapshot.expiresAtList, []);
  });

  it("treats an empty protobuf message as zero resets", () => {
    const empty = Buffer.from("0000000000", "hex");
    const snapshot = parseGrokResetCreditsResponse(empty);

    assert.equal(snapshot.availableCount, 0);
    assert.deepEqual(snapshot.expiresAtList, []);
  });

  it("counts repeated reset tokens", () => {
    const token = "5221520d726573746f6b5f76705944716fa20106089c80f3d306f20106089cbd96d506";
    const twoTokens = Buffer.from(`0000000046${token}${token}800000000f677270632d7374617475733a300d0a`, "hex");
    const now = new Date("2026-08-13T12:00:00Z");
    const snapshot = parseGrokResetCreditsResponse(twoTokens, now);

    assert.equal(snapshot.availableCount, 2);
    assert.deepEqual(snapshot.expiresAtList, ["2026-09-12T18:49:00.000Z", "2026-09-12T18:49:00.000Z"]);
  });

  it("rejects non-zero grpc-status", () => {
    const bad = Buffer.from("800000000f677270632d7374617475733a310d0a", "hex");
    assert.throws(() => parseGrokResetCreditsResponse(bad), /gRPC status 1/);
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
