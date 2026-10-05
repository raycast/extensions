// PURE: unwraps a value Chromium stored in an IndexedDB blob file (an Electron app's own state, e.g. Slack's; ADR-036)
// down to V8's serialization of it, which os.ts reads with Node's v8.deserialize. No Raycast/Node imports.
//
// A blob file is: Chromium's wrapper (`FF 11 02`: the value is Snappy-compressed; `FF 11` with anything else is
// unknown), then Blink's header (`FF <version>`, and from Blink version 21 a trailer offset: `FE` + 12 bytes), then
// V8's (`FF <wire version>`). Electron's V8 writes wire version 16, which only widened ArrayBuffer lengths and
// offsets; Node 22 reads up to 15, so 16 is read as 15. Values with ArrayBuffers are the one thing that can differ,
// and app state persisted as plain objects has none.

/** Highest V8 wire version read, and the one it's read as. */
const NEWEST_WIRE = 16;
const NODE_WIRE = 15;

/** Raw (unframed) Snappy: a varint length, then literals and back-references. Throws on malformed input. */
export function snappyDecompress(input: Uint8Array): Uint8Array {
  let pos = 0;
  let length = 0;
  for (let shift = 0; ; shift += 7) {
    if (pos >= input.length || shift > 28) throw new Error("snappy: bad length");
    const byte = input[pos++];
    length += (byte & 0x7f) * 2 ** shift;
    if (!(byte & 0x80)) break;
  }
  const out = new Uint8Array(length);
  let o = 0;
  const readLE = (bytes: number) => {
    let n = 0;
    for (let i = 0; i < bytes; i++) n += input[pos++] * 2 ** (8 * i);
    return n;
  };
  while (pos < input.length) {
    const tag = input[pos++];
    if ((tag & 3) === 0) {
      let len = tag >> 2;
      if (len >= 60) len = readLE(len - 59);
      len += 1;
      if (pos + len > input.length || o + len > length) throw new Error("snappy: literal out of bounds");
      out.set(input.subarray(pos, pos + len), o);
      pos += len;
      o += len;
      continue;
    }
    let len: number;
    let offset: number;
    if ((tag & 3) === 1) {
      len = ((tag >> 2) & 7) + 4;
      offset = ((tag >> 5) << 8) | input[pos++];
    } else {
      len = (tag >> 2) + 1;
      offset = readLE((tag & 3) === 2 ? 2 : 4);
    }
    if (offset === 0 || offset > o || o + len > length) throw new Error("snappy: copy out of bounds");
    // Byte by byte: a copy may overlap what it writes (offset < len repeats a pattern).
    for (let i = 0; i < len; i++, o++) out[o] = out[o - offset];
  }
  if (o !== length) throw new Error("snappy: short output");
  return out;
}

/**
 * The V8 serialization inside a blob file's bytes, ready for v8.deserialize (wire version 16 rewritten to 15).
 * Throws on any other layout, or a newer V8 wire version: the app's storage changed.
 */
export function v8Payload(file: Uint8Array): Uint8Array {
  let value = file;
  if (file[0] === 0xff && file[1] === 0x11) {
    if (file[2] !== 0x02) throw new Error(`indexeddb: unknown wrapper ${file[2]}`);
    value = snappyDecompress(file.subarray(3));
  }
  if (value[0] !== 0xff) throw new Error("indexeddb: no Blink header");
  let pos = 2;
  if (value[pos] === 0xfe) pos += 13;
  if (value[pos] !== 0xff) throw new Error("indexeddb: no V8 header");
  const wire = value[pos + 1];
  if (wire > NEWEST_WIRE) throw new Error(`indexeddb: V8 wire version ${wire}`);
  const payload = value.slice(pos);
  if (wire > NODE_WIRE) payload[1] = NODE_WIRE;
  return payload;
}
