import { describe, expect, it } from "vitest";
import { findPathInUidCache, uidToId } from "../src/lib/uid-cache";

// Same layout as ResourceUID::encode_binary_cache(): u32 count, then u64 id, u32 length and UTF-8 path per entry.
function encodeCache(entries: [bigint, string][]): Buffer {
  const parts: Buffer[] = [];
  const header = Buffer.alloc(4);
  header.writeUInt32LE(entries.length);
  parts.push(header);
  for (const [id, filePath] of entries) {
    const text = Buffer.from(filePath, "utf8");
    const head = Buffer.alloc(12);
    head.writeBigUInt64LE(id);
    head.writeUInt32LE(text.length, 8);
    parts.push(head, text);
  }
  return Buffer.concat(parts);
}

describe("uidToId", () => {
  it("matches the largest UID from the Godot source", () => {
    // resource_uid.cpp: "Max 0x7FFFFFFFFFFFFFFF (uid://d4n4ub6itg400)".
    expect(uidToId("uid://d4n4ub6itg400")).toBe(0x7fffffffffffffffn);
  });

  it("decodes letters before digits", () => {
    expect(uidToId("uid://a")).toBe(0n);
    expect(uidToId("uid://y")).toBe(24n);
    expect(uidToId("uid://0")).toBe(25n);
    expect(uidToId("uid://ba")).toBe(34n);
  });

  it("rejects text that isn't a UID", () => {
    expect(uidToId("res://icon.svg")).toBeUndefined();
    expect(uidToId("uid://<invalid>")).toBeUndefined();
    expect(uidToId("uid://ABC")).toBeUndefined();
  });
});

describe("findPathInUidCache", () => {
  const iconId = uidToId("uid://cl4ymsdo1rdxx")!;
  const cache = encodeCache([
    [uidToId("uid://b1x2main")!, "res://main.tscn"],
    [iconId, "res://art/icône.png"],
  ]);

  it("finds the path for a UID", () => {
    expect(findPathInUidCache(cache, "uid://cl4ymsdo1rdxx")).toBe("res://art/icône.png");
    expect(findPathInUidCache(cache, "uid://b1x2main")).toBe("res://main.tscn");
  });

  it("returns undefined for unknown UIDs", () => {
    expect(findPathInUidCache(cache, "uid://dddddddd")).toBeUndefined();
  });

  it("returns undefined for a damaged cache instead of throwing", () => {
    expect(findPathInUidCache(Buffer.alloc(0), "uid://cl4ymsdo1rdxx")).toBeUndefined();
    expect(findPathInUidCache(cache.subarray(0, cache.length - 3), "uid://cl4ymsdo1rdxx")).toBeUndefined();
    const wrongCount = Buffer.from(cache);
    wrongCount.writeUInt32LE(50, 0);
    expect(findPathInUidCache(wrongCount, "uid://dddddddd")).toBeUndefined();
  });
});
