import { describe, expect, it } from "vitest";
import { decodePayload, encodePayload } from "./payload";
import { AlterEgoPayload } from "./types";

describe("encodePayload / decodePayload round trip", () => {
  it("round-trips a simple payload", () => {
    const payload: AlterEgoPayload = {
      name: "Browser",
      map: {
        martin: { type: "app", value: "/Applications/Arc.app" },
      },
    };

    const result = decodePayload(encodePayload(payload));

    expect(result).toEqual({ ok: true, payload });
  });

  it("round-trips values containing ?, &, and =", () => {
    const payload: AlterEgoPayload = {
      name: "Browser",
      map: {
        work: {
          type: "deeplink",
          value: "raycast://extensions/raycast/calendar/my-schedule?arguments=%7B%22a%22%3A1%7D&x=y=z",
        },
      },
    };

    const result = decodePayload(encodePayload(payload));

    expect(result).toEqual({ ok: true, payload });
  });

  it("round-trips a payload with an empty map", () => {
    const payload: AlterEgoPayload = { name: "Browser", map: {} };

    const result = decodePayload(encodePayload(payload));

    expect(result).toEqual({ ok: true, payload });
  });
});

describe("decodePayload malformed input", () => {
  it("rejects invalid base64 characters", () => {
    const result = decodePayload("not valid base64url!!!");

    expect(result).toEqual({ ok: false, reason: "invalid-base64" });
  });

  it("rejects standard-base64-only characters (+, /, =)", () => {
    const result = decodePayload("abc+/==");

    expect(result.ok).toBe(false);
  });

  it("rejects an empty string", () => {
    const result = decodePayload("");

    expect(result).toEqual({ ok: false, reason: "invalid-base64" });
  });

  it("rejects valid base64url that decodes to invalid JSON", () => {
    const garbage = Buffer.from("{not json", "utf8").toString("base64url");

    const result = decodePayload(garbage);

    expect(result).toEqual({ ok: false, reason: "invalid-json" });
  });

  it("rejects a payload that isn't an object", () => {
    const notAnObject = Buffer.from(JSON.stringify(["a", "b"]), "utf8").toString("base64url");

    const result = decodePayload(notAnObject);

    expect(result).toEqual({ ok: false, reason: "invalid-shape" });
  });

  it("rejects a missing name", () => {
    const missingName = Buffer.from(
      JSON.stringify({ map: { martin: { type: "app", value: "/Applications/Arc.app" } } }),
      "utf8",
    ).toString("base64url");

    const result = decodePayload(missingName);

    expect(result).toEqual({ ok: false, reason: "invalid-shape" });
  });

  it("rejects an empty/whitespace name", () => {
    const blankName = Buffer.from(JSON.stringify({ name: "   ", map: {} }), "utf8").toString("base64url");

    const result = decodePayload(blankName);

    expect(result).toEqual({ ok: false, reason: "invalid-shape" });
  });

  it("rejects an unknown target type", () => {
    const badType = Buffer.from(
      JSON.stringify({ name: "Browser", map: { martin: { type: "script", value: "echo hi" } } }),
      "utf8",
    ).toString("base64url");

    const result = decodePayload(badType);

    expect(result).toEqual({ ok: false, reason: "invalid-shape" });
  });

  it("rejects a target missing its value", () => {
    const missingValue = Buffer.from(
      JSON.stringify({ name: "Browser", map: { martin: { type: "app" } } }),
      "utf8",
    ).toString("base64url");

    const result = decodePayload(missingValue);

    expect(result).toEqual({ ok: false, reason: "invalid-shape" });
  });
});
