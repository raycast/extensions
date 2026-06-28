import { describe, expect, it } from "vitest";
import { parseServerUrl } from "./server-url";

describe("parseServerUrl", () => {
  it("treats host-only URLs as base URLs without custom paths", () => {
    expect(parseServerUrl("http://localhost:8000")).toEqual({
      baseUrl: "http://localhost:8000",
      hasCustomPath: false,
      fullUrl: "http://localhost:8000/",
    });
  });

  it("detects custom paths for legacy endpoints", () => {
    expect(parseServerUrl("http://localhost:8000/custom/tts")).toEqual({
      baseUrl: "http://localhost:8000",
      hasCustomPath: true,
      fullUrl: "http://localhost:8000/custom/tts",
    });
  });
});
