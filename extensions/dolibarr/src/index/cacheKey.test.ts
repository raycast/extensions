import { describe, expect, it } from "vitest";
import { indexCacheKey } from "./cacheKey";

const URL_A = "https://dolibarr.example.org/api/index.php";
const URL_B = "http://localhost:8091/api/index.php";
const KEY_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const KEY_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("indexCacheKey", () => {
  it("returns the same key for the same configuration", () => {
    expect(indexCacheKey(URL_A, KEY_A)).toBe(indexCacheKey(URL_A, KEY_A));
  });

  it("separates two instances", () => {
    expect(indexCacheKey(URL_A, KEY_A)).not.toBe(indexCacheKey(URL_B, KEY_A));
  });

  it("separates two keys on the same instance", () => {
    expect(indexCacheKey(URL_A, KEY_A)).not.toBe(indexCacheKey(URL_A, KEY_B));
  });

  it("exposes neither the address nor the secret", () => {
    const key = indexCacheKey(URL_A, KEY_A);
    expect(key).not.toContain("dolibarr.example.org");
    expect(key).not.toContain(KEY_A);
  });

  it("keeps the two fields apart, so a shifted boundary is a different key", () => {
    expect(indexCacheKey("https://a.example", "b c")).not.toBe(indexCacheKey("https://a.example b", "c"));
  });
});
