import { describe, expect, it } from "vitest";
import { resolveCountryInput } from "../resolve-country";

describe("resolveCountryInput", () => {
  it("matches exact country codes case-insensitively", () => {
    expect(resolveCountryInput("de")).toEqual({ ok: true, code: "DE" });
    expect(resolveCountryInput("DE")).toEqual({ ok: true, code: "DE" });
    expect(resolveCountryInput("  fr  ")).toEqual({ ok: true, code: "FR" });
  });

  it("matches exact English names case-insensitively", () => {
    expect(resolveCountryInput("germany")).toEqual({ ok: true, code: "DE" });
    expect(resolveCountryInput("GERMANY")).toEqual({ ok: true, code: "DE" });
  });

  it("matches a unique name prefix", () => {
    expect(resolveCountryInput("ger")).toEqual({ ok: true, code: "DE" });
  });

  it("rejects ambiguous prefix matches", () => {
    const result = resolveCountryInput("slo");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("ambiguous");
      expect(result.matches?.length).toBeGreaterThan(1);
    }
  });

  it("rejects unknown input", () => {
    const result = resolveCountryInput("atlantis");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unknown");
      expect(result.query).toBe("atlantis");
    }
  });

  it("rejects empty and whitespace-only input", () => {
    expect(resolveCountryInput("").ok).toBe(false);
    expect(resolveCountryInput("   ").ok).toBe(false);
  });
});
