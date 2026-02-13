import { createSteamTotpGenerator } from "./steamTotp";

/** 2023-01-01 00:00:00 UTC in milliseconds (matches Bitwarden SDK test vectors). */
const TEST_TIMESTAMP_MS = 1672531200000;

describe("createSteamTotpGenerator", () => {
  it("generates the expected code for HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ at 2023-01-01 00:00:00 UTC", () => {
    const generator = createSteamTotpGenerator("HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ");
    const code = generator.generate(TEST_TIMESTAMP_MS);
    expect(code).toBe("7W6CJ");
  });

  it("returns 5-character codes from the Steam alphabet", () => {
    const generator = createSteamTotpGenerator("HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ");
    const code = generator.generate(TEST_TIMESTAMP_MS);
    const steamChars = "23456789BCDFGHJKMNPQRTVWXY";
    expect(code).toHaveLength(5);
    expect([...code].every((c) => steamChars.includes(c))).toBe(true);
  });

  it("has period of 30 seconds", () => {
    const generator = createSteamTotpGenerator("HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ");
    expect(generator.period).toBe(30);
  });

  it("remaining() returns milliseconds until next period", () => {
    const generator = createSteamTotpGenerator("HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ");
    // At 2023-01-01 00:00:00 UTC, elapsed in period is 0, so remaining is 30 * 1000
    const remaining = generator.remaining(TEST_TIMESTAMP_MS);
    expect(remaining).toBe(30000);
  });

  it("remaining() decreases as time progresses within the period", () => {
    const generator = createSteamTotpGenerator("HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ");
    // 15 seconds into the period
    const remaining = generator.remaining(TEST_TIMESTAMP_MS + 15_000);
    expect(remaining).toBe(15000);
  });

  it("generates the same code for timestamps within the same 30-second window", () => {
    const generator = createSteamTotpGenerator("HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ");
    const code1 = generator.generate(TEST_TIMESTAMP_MS);
    const code2 = generator.generate(TEST_TIMESTAMP_MS + 15_000);
    expect(code1).toBe(code2);
  });

  it("generates different codes for different 30-second windows", () => {
    const generator = createSteamTotpGenerator("HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ");
    const code1 = generator.generate(TEST_TIMESTAMP_MS);
    const code2 = generator.generate(TEST_TIMESTAMP_MS + 30_000);
    expect(code1).not.toBe(code2);
  });

  it("produces deterministic output for the same timestamp", () => {
    const generator = createSteamTotpGenerator("HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ");
    const code1 = generator.generate(TEST_TIMESTAMP_MS);
    const code2 = generator.generate(TEST_TIMESTAMP_MS);
    expect(code1).toBe(code2);
  });

  it("throws for invalid Base32 secret", () => {
    expect(() => createSteamTotpGenerator("invalid!!!")).toThrow();
  });
});
