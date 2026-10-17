import { describe, expect, it } from "vitest";
import {
  accessTokenSettingsUrl,
  DEFAULT_INSTANCE_URL,
  displayInstanceUrl,
  memoUrl,
  normalizeInstanceUrl,
} from "../../src/helpers/instanceUrl";

describe("normalizeInstanceUrl", () => {
  it("falls back to the demo instance when blank", () => {
    expect(normalizeInstanceUrl("   ")).toBe(DEFAULT_INSTANCE_URL);
  });

  it("strips trailing slashes", () => {
    expect(normalizeInstanceUrl("https://memos.example.com///")).toBe("https://memos.example.com");
  });

  it("assumes https when the scheme is missing", () => {
    expect(normalizeInstanceUrl("memos.example.com")).toBe("https://memos.example.com");
  });

  it("keeps http, ports and sub-paths", () => {
    expect(normalizeInstanceUrl("http://192.168.1.10:5230/memos/")).toBe("http://192.168.1.10:5230/memos");
  });

  it("rejects non-http schemes", () => {
    expect(() => normalizeInstanceUrl("ftp://memos.example.com")).toThrow(
      '"ftp://memos.example.com" is not a valid instance URL',
    );
  });

  it("rejects text that is not a URL", () => {
    expect(() => normalizeInstanceUrl("not a url")).toThrow('"not a url" is not a valid instance URL');
  });
});

describe("displayInstanceUrl", () => {
  it("assumes https when the scheme is missing", () => {
    expect(displayInstanceUrl("memos.example.com")).toBe("https://memos.example.com");
  });

  it("strips trailing slashes", () => {
    expect(displayInstanceUrl("https://memos.example.com///")).toBe("https://memos.example.com");
  });

  it("returns the trimmed raw input when it isn't a valid URL", () => {
    expect(displayInstanceUrl("  not a url  ")).toBe("not a url");
  });

  it("falls back to the demo instance when blank", () => {
    expect(displayInstanceUrl("   ")).toBe(DEFAULT_INSTANCE_URL);
  });
});

describe("accessTokenSettingsUrl", () => {
  it("points at the access token section of the instance settings", () => {
    expect(accessTokenSettingsUrl("https://demo.usememos.com")).toBe(
      "https://demo.usememos.com/setting#access-token",
    );
  });
});

describe("memoUrl", () => {
  it("links to the memo page on the instance", () => {
    expect(memoUrl("https://memos.example.com", "memos/abc")).toBe("https://memos.example.com/memos/abc");
  });
});
