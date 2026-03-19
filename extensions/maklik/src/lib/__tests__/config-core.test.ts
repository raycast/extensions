import { describe, expect, it } from "vitest";

import { ConfigValidationError, parsePreferences, RawPreferences } from "../config-core";

function makeRawPreferences(overrides: Partial<RawPreferences> = {}): RawPreferences {
  return {
    endpoint: "https://example.r2.cloudflarestorage.com",
    bucket: "shots",
    region: "auto",
    accessKeyId: "access-key",
    secretAccessKey: "secret-key",
    publicBaseUrl: "https://shots.example.com",
    keyPrefix: "captures",
    forcePathStyle: true,
    maxUploadBytes: "1048576",
    maxRetries: "3",
    ...overrides,
  };
}

describe("parsePreferences", () => {
  it("parses valid preferences", () => {
    const config = parsePreferences(makeRawPreferences());
    expect(config.endpoint).toBe("https://example.r2.cloudflarestorage.com");
    expect(config.bucket).toBe("shots");
    expect(config.publicBaseUrl).toBe("https://shots.example.com");
    expect(config.maxUploadBytes).toBe(1_048_576);
    expect(config.maxRetries).toBe(3);
    expect(config.keyPrefix).toBe("captures");
  });

  it("applies defaults for optional numeric fields", () => {
    const config = parsePreferences(makeRawPreferences({ maxUploadBytes: "", maxRetries: "" }));
    expect(config.maxUploadBytes).toBe(1_048_576);
    expect(config.maxRetries).toBe(3);
  });

  it("throws ConfigValidationError for invalid fields", () => {
    expect(() =>
      parsePreferences(
        makeRawPreferences({
          endpoint: "not-a-url",
          publicBaseUrl: "",
          maxUploadBytes: "0",
          maxRetries: "-1",
        }),
      ),
    ).toThrowError(ConfigValidationError);
  });
});
