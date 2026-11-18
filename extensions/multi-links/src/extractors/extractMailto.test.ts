import { describe, it, expect } from "vitest";
import { extractMailto } from "./extractMailto";

describe("extractMailto (EXT-04)", () => {
  it("extracts mailto:", () => {
    const result = extractMailto("email mailto:foo@example.com today");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      raw: "mailto:foo@example.com",
      url: "mailto:foo@example.com",
      type: "mailto",
    });
  });

  it("extracts tel:", () => {
    const result = extractMailto("call tel:+15551234567 now");
    expect(result[0].raw).toBe("tel:+15551234567");
    expect(result[0].type).toBe("mailto");
  });

  it("extracts sms:", () => {
    const result = extractMailto("text sms:+15551234567 here");
    expect(result[0].raw).toBe("sms:+15551234567");
  });

  it("captures index", () => {
    const result = extractMailto("xx mailto:a@b.com");
    expect(result[0].index).toBe(3);
  });

  it("strips trailing punctuation", () => {
    const result = extractMailto("at mailto:foo@bar.com.");
    expect(result[0].raw).toBe("mailto:foo@bar.com");
  });

  it("does not match bare emails (no mailto: prefix)", () => {
    expect(extractMailto("foo@bar.com")).toEqual([]);
  });
});
