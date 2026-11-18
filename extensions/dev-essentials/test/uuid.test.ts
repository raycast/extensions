import { describe, expect, it } from "vitest";
import { generateUuid, parseUuidVersion, uuidV7 } from "../src/lib/uuid";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-([47])[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuid", () => {
  it("parses versions", () => {
    expect(parseUuidVersion(undefined)).toBe(4);
    expect(parseUuidVersion("")).toBe(4);
    expect(parseUuidVersion("V7")).toBe(7);
    expect(parseUuidVersion(" 4 ")).toBe(4);
    expect(() => parseUuidVersion("v1")).toThrow();
  });

  it("generates v4 and v7", () => {
    expect(generateUuid(4).match(UUID_RE)?.[1]).toBe("4");
    expect(generateUuid(7).match(UUID_RE)?.[1]).toBe("7");
  });

  it("encodes the timestamp in v7", () => {
    const now = 1_700_000_000_123;
    const id = uuidV7(now);
    expect(parseInt(id.replace(/-/g, "").slice(0, 12), 16)).toBe(now);
  });
});
