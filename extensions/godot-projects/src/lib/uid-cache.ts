// Since Godot 4.4 the project icon can be saved as a `uid://` reference. The editor maps UIDs to
// `res://` paths in `.godot/uid_cache.bin`. This follows ResourceUID::text_to_id() and
// ResourceUID::get_path_from_cache() in core/io/resource_uid.cpp.

const UINT64_MASK = (1n << 64n) - 1n;
const INT64_MAX = (1n << 63n) - 1n;
const LETTER_COUNT = 25; // 'z' - 'a' in the Godot source
const BASE = 34n; // LETTER_COUNT + ('9' - '0')

export function uidToId(uid: string): bigint | undefined {
  if (!uid.startsWith("uid://") || uid === "uid://<invalid>") return undefined;
  let id = 0n;
  for (const char of uid.slice("uid://".length)) {
    const code = char.charCodeAt(0);
    let digit: number;
    if (char >= "a" && char <= "z") {
      digit = code - 97;
    } else if (char >= "0" && char <= "9") {
      digit = code - 48 + LETTER_COUNT;
    } else {
      return undefined;
    }
    id = (id * BASE + BigInt(digit)) & UINT64_MASK;
  }
  return id & INT64_MAX;
}

/** Returns the `res://` path for a UID, or undefined when the cache doesn't have it or is damaged. */
export function findPathInUidCache(cache: Buffer, uid: string): string | undefined {
  const id = uidToId(uid);
  if (id === undefined || cache.length < 4) return undefined;

  const count = cache.readUInt32LE(0);
  let offset = 4;
  for (let index = 0; index < count; index++) {
    if (offset + 12 > cache.length) return undefined;
    const entryId = cache.readBigUInt64LE(offset);
    const length = cache.readInt32LE(offset + 8);
    offset += 12;
    if (length < 0 || offset + length > cache.length) return undefined;
    if (entryId === id) return cache.toString("utf8", offset, offset + length);
    offset += length;
  }
  return undefined;
}
