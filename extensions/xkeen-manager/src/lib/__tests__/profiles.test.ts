import { describe, expect, test, vi } from "vitest";

vi.mock("@raycast/api", () => ({ getPreferenceValues: () => ({ sshHost: "xkeen" }) }));

import { parseProfileMetaBlocks, validateProfileName } from "../profiles";

describe("validateProfileName", () => {
  test("rejects an empty name", () => {
    expect(validateProfileName("")).toBe("Profile name is required");
  });

  test("rejects names longer than 128 characters", () => {
    const name = "a".repeat(129);
    expect(validateProfileName(name)).toBe("Profile name is too long (max 128)");
  });

  test("accepts a name exactly at the 128 character limit", () => {
    const name = "a".repeat(128);
    expect(validateProfileName(name)).toBeNull();
  });

  test("rejects names starting with a dot", () => {
    expect(validateProfileName(".hidden")).toBe("Profile name cannot start with '.'");
  });

  test("rejects names containing a slash", () => {
    expect(validateProfileName("a/b")).toBe("Profile name cannot contain '/' or null byte");
  });

  test("rejects names containing a null byte", () => {
    expect(validateProfileName("a\0b")).toBe("Profile name cannot contain '/' or null byte");
  });

  test("accepts a valid name", () => {
    expect(validateProfileName("my-profile")).toBeNull();
  });
});

describe("parseProfileMetaBlocks", () => {
  test("parses a single valid block", () => {
    const text = '___META_START___germany\n{"name":"germany","lastKnownGood":true}\n___META_END___';
    expect(parseProfileMetaBlocks(text)).toEqual({ germany: { name: "germany", lastKnownGood: true } });
  });

  test("parses multiple blocks", () => {
    const text = [
      '___META_START___germany\n{"name":"germany"}\n___META_END___',
      '___META_START___japan\n{"name":"japan"}\n___META_END___',
    ].join("\n");
    expect(parseProfileMetaBlocks(text)).toEqual({
      germany: { name: "germany" },
      japan: { name: "japan" },
    });
  });

  test("skips a block with invalid JSON", () => {
    const text = [
      "___META_START___broken\nnot json\n___META_END___",
      '___META_START___ok\n{"name":"ok"}\n___META_END___',
    ].join("\n");
    expect(parseProfileMetaBlocks(text)).toEqual({ ok: { name: "ok" } });
  });

  test("returns an empty object for empty input", () => {
    expect(parseProfileMetaBlocks("")).toEqual({});
  });
});
