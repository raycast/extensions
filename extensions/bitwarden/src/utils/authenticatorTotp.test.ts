import { createTotpGenerator, getGenerator, parseTotp } from "~/utils/authenticatorTotp";

/** 2023-01-01 00:00:00 UTC in milliseconds (matches Bitwarden SDK test vectors). */
const TEST_TIMESTAMP_MS = 1672531200000;

describe("parseTotp", () => {
  it("parses otpauth URI and returns correct options", () => {
    const uri = "otpauth://totp/ACME:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ACME&period=30";
    const opts = parseTotp(uri);
    expect(opts.secret).toBe("JBSWY3DPEHPK3PXP");
    expect(opts.period).toBe(30);
    expect(opts.algorithm).toBe("sha1");
    expect(opts.digits).toBe(6);
  });

  it("uses default period, algorithm, digits when not in URI", () => {
    const uri = "otpauth://totp/Test:user?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY";
    const opts = parseTotp(uri);
    expect(opts.secret).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY");
    expect(opts.period).toBe(30);
    expect(opts.algorithm).toBe("sha1");
    expect(opts.digits).toBe(6);
  });

  it("returns raw secret with defaults when input is not otpauth URI", () => {
    const opts = parseTotp("JBSWY3DPEHPK3PXP");
    expect(opts.secret).toBe("JBSWY3DPEHPK3PXP");
    expect(opts.period).toBe(30);
    expect(opts.algorithm).toBe("sha1");
    expect(opts.digits).toBe(6);
  });

  it("throws for non-TOTP otpauth URI", () => {
    const uri = "otpauth://hotp/ACME:user?secret=JBSWY3DPEHPK3PXP&issuer=ACME&counter=0";
    expect(() => parseTotp(uri)).toThrow("Invalid authenticator key");
  });

  it("throws for invalid otpauth URI", () => {
    expect(() => parseTotp("otpauth://totp/invalid")).toThrow();
  });
});

describe("getGenerator (regular TOTP)", () => {
  /** RFC 6238 test vector: secret GEZDGNBVGY3TQOJQGEZDGNBVGY at epoch 59, 8 digits → 94287082 */
  const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY";
  const RFC_EPOCH_59_MS = 59 * 1000;
  const RFC_URI_8_DIGITS = `otpauth://totp/Test?secret=${RFC_SECRET}&digits=8`;

  it("generates 8-digit TOTP for RFC 6238 test vector at epoch 59", () => {
    const [generator, error] = getGenerator(RFC_URI_8_DIGITS);
    if (error) throw error;
    const code = generator!.generate(RFC_EPOCH_59_MS);
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^\d{8}$/);
    expect(generator!.generate(RFC_EPOCH_59_MS)).toBe(code);
  });

  it("remaining() returns correct milliseconds", () => {
    const [generator, error] = getGenerator(RFC_URI_8_DIGITS);
    if (error) throw error;
    const gen = generator!;
    // At epoch 59, elapsed in 30s period = 29, remaining = 1 second = 1000 ms
    const remaining = gen.remaining(RFC_EPOCH_59_MS);
    expect(remaining).toBe(1000);
  });

  it("has period of 30 for default TOTP", () => {
    const [generator, error] = getGenerator(RFC_URI_8_DIGITS);
    if (error) throw error;
    expect(generator!.period).toBe(30);
  });

  it("parses otpauth URI and generates TOTP", () => {
    const [generator, error] = getGenerator(RFC_URI_8_DIGITS);
    if (error) throw error;
    const code = generator!.generate(RFC_EPOCH_59_MS);
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^\d{8}$/);
  });

  it("returns error for invalid otpauth URI", () => {
    const [, error] = getGenerator("otpauth://totp/invalid");
    expect(error).toBeTruthy();
    expect(error!.message).toContain("parse");
  });

  it("accepts 16-character (10-byte) secret for Bitwarden/Google compatibility", () => {
    const uri = "otpauth://totp/ACME:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ACME&period=30";
    const [generator, error] = getGenerator(uri);
    if (error) throw error;
    const code = generator!.generate();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^\d{6}$/);
  });
});

describe("getGenerator (Steam Guard)", () => {
  it("generates the expected code for HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ at 2023-01-01 00:00:00 UTC", () => {
    const [generator, error] = getGenerator("steam://HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ");
    if (error) throw error;
    const code = generator!.generate(TEST_TIMESTAMP_MS);
    expect(code).toBe("7W6CJ");
  });

  it("returns 5-character codes from the Steam alphabet", () => {
    const generator = createTotpGenerator({ variant: "steam", secret: "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ" });
    const code = generator.generate(TEST_TIMESTAMP_MS);
    const steamChars = "23456789BCDFGHJKMNPQRTVWXY";
    expect(code).toHaveLength(5);
    expect([...code].every((c) => steamChars.includes(c))).toBe(true);
  });

  it("has period of 30 seconds", () => {
    const generator = createTotpGenerator({ variant: "steam", secret: "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ" });
    expect(generator.period).toBe(30);
  });

  it("remaining() returns milliseconds until next period", () => {
    const generator = createTotpGenerator({ variant: "steam", secret: "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ" });
    const remaining = generator.remaining(TEST_TIMESTAMP_MS);
    expect(remaining).toBe(30000);
  });

  it("remaining() decreases as time progresses within the period", () => {
    const generator = createTotpGenerator({ variant: "steam", secret: "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ" });
    const remaining = generator.remaining(TEST_TIMESTAMP_MS + 15_000);
    expect(remaining).toBe(15000);
  });

  it("generates the same code for timestamps within the same 30-second window", () => {
    const generator = createTotpGenerator({ variant: "steam", secret: "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ" });
    const code1 = generator.generate(TEST_TIMESTAMP_MS);
    const code2 = generator.generate(TEST_TIMESTAMP_MS + 15_000);
    expect(code1).toBe(code2);
  });

  it("generates different codes for different 30-second windows", () => {
    const generator = createTotpGenerator({ variant: "steam", secret: "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ" });
    const code1 = generator.generate(TEST_TIMESTAMP_MS);
    const code2 = generator.generate(TEST_TIMESTAMP_MS + 30_000);
    expect(code1).not.toBe(code2);
  });

  it("produces deterministic output for the same timestamp", () => {
    const generator = createTotpGenerator({ variant: "steam", secret: "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ" });
    const code1 = generator.generate(TEST_TIMESTAMP_MS);
    const code2 = generator.generate(TEST_TIMESTAMP_MS);
    expect(code1).toBe(code2);
  });

  it("throws for invalid Base32 secret when generating", () => {
    const generator = createTotpGenerator({ variant: "steam", secret: "invalid!!!" });
    expect(() => generator.generate()).toThrow();
  });
});
