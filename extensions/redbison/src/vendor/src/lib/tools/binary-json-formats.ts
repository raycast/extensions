/**
 * Decoders for the two binary JSON cousins people actually meet:
 * MessagePack (msgpack.org spec) and CBOR (RFC 8949). Both decode to plain
 * values for display as JSON, with the lossy edges made visible instead of
 * silent: 64-bit integers beyond 2^53 come back as decimal strings tagged
 * `$int64`, binary payloads as `$bytes` hex previews, msgpack extension
 * types as `$ext`, CBOR tags as `$tag` wrappers, and non-string map keys
 * are stringified with a note. A decoder that pretends those cases do not
 * exist produces JSON that re-encodes to a different document.
 *
 * Dependency-free on purpose: the CLI bundles both, and they back the MCP
 * tools.
 */

type Out = unknown;

const hexPreview = (b: Uint8Array): Out => ({
  $bytes: b.length,
  hex: [...b.subarray(0, 32)].map((x) => x.toString(16).padStart(2, '0')).join('') + (b.length > 32 ? '…' : ''),
});

const bigOut = (v: bigint): Out => (v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : { $int64: v.toString() });

class Reader {
  pos = 0;
  view: DataView;
  constructor(readonly b: Uint8Array) {
    this.view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  }
  need(n: number): void {
    if (this.pos + n > this.b.length) throw new Error(`Truncated at byte ${this.pos}: needed ${n} more.`);
  }
  u8(): number { this.need(1); return this.b[this.pos++]; }
  u16(): number { this.need(2); const v = this.view.getUint16(this.pos); this.pos += 2; return v; }
  u32(): number { this.need(4); const v = this.view.getUint32(this.pos); this.pos += 4; return v; }
  u64(): bigint { this.need(8); const v = this.view.getBigUint64(this.pos); this.pos += 8; return v; }
  i8(): number { this.need(1); return this.view.getInt8(this.pos++); }
  i16(): number { this.need(2); const v = this.view.getInt16(this.pos); this.pos += 2; return v; }
  i32(): number { this.need(4); const v = this.view.getInt32(this.pos); this.pos += 4; return v; }
  i64(): bigint { this.need(8); const v = this.view.getBigInt64(this.pos); this.pos += 8; return v; }
  f32(): number { this.need(4); const v = this.view.getFloat32(this.pos); this.pos += 4; return v; }
  f64(): number { this.need(8); const v = this.view.getFloat64(this.pos); this.pos += 8; return v; }
  bytes(n: number): Uint8Array { this.need(n); const v = this.b.subarray(this.pos, this.pos + n); this.pos += n; return v; }
  str(n: number): string { return new TextDecoder().decode(this.bytes(n)); }
}

/**
 * A map entry as an own property. Plain assignment of a `__proto__` key calls
 * the inherited setter: the field vanishes from the JSON and the object's
 * prototype becomes the decoded value. Both formats allow that key, so it
 * has to be defined, not assigned.
 */
function putEntry(out: Record<string, Out>, key: string, value: Out): void {
  Object.defineProperty(out, key, { value, enumerable: true, writable: true, configurable: true });
}

/* ---------------- MessagePack ---------------- */

export function decodeMessagePack(bytes: Uint8Array): { value: Out; trailingBytes: number } {
  const r = new Reader(bytes);
  const value = mp(r, 0);
  return { value, trailingBytes: bytes.length - r.pos };
}

function mp(r: Reader, depth: number): Out {
  if (depth > 64) throw new Error('Nested deeper than 64 levels.');
  const t = r.u8();
  if (t <= 0x7f) return t;
  if (t >= 0xe0) return t - 256;
  if (t >= 0x80 && t <= 0x8f) return mpMap(r, t & 0x0f, depth);
  if (t >= 0x90 && t <= 0x9f) return mpArr(r, t & 0x0f, depth);
  if (t >= 0xa0 && t <= 0xbf) return r.str(t & 0x1f);
  switch (t) {
    case 0xc0: return null;
    case 0xc2: return false;
    case 0xc3: return true;
    case 0xc4: return hexPreview(r.bytes(r.u8()));
    case 0xc5: return hexPreview(r.bytes(r.u16()));
    case 0xc6: return hexPreview(r.bytes(r.u32()));
    case 0xc7: { const n = r.u8(); const type = r.i8(); return { $ext: type, ...(hexPreview(r.bytes(n)) as object) }; }
    case 0xc8: { const n = r.u16(); const type = r.i8(); return { $ext: type, ...(hexPreview(r.bytes(n)) as object) }; }
    case 0xc9: { const n = r.u32(); const type = r.i8(); return { $ext: type, ...(hexPreview(r.bytes(n)) as object) }; }
    case 0xca: return r.f32();
    case 0xcb: return r.f64();
    case 0xcc: return r.u8();
    case 0xcd: return r.u16();
    case 0xce: return r.u32();
    case 0xcf: return bigOut(r.u64());
    case 0xd0: return r.i8();
    case 0xd1: return r.i16();
    case 0xd2: return r.i32();
    case 0xd3: return bigOut(r.i64());
    case 0xd4: case 0xd5: case 0xd6: case 0xd7: case 0xd8: {
      const n = 1 << (t - 0xd4);
      const type = r.i8();
      const data = r.bytes(n);
      if (type === -1) return { $timestamp: mpTimestamp(data) };
      return { $ext: type, ...(hexPreview(data) as object) };
    }
    case 0xd9: return r.str(r.u8());
    case 0xda: return r.str(r.u16());
    case 0xdb: return r.str(r.u32());
    case 0xdc: return mpArr(r, r.u16(), depth);
    case 0xdd: return mpArr(r, r.u32(), depth);
    case 0xde: return mpMap(r, r.u16(), depth);
    case 0xdf: return mpMap(r, r.u32(), depth);
    default: throw new Error(`0x${t.toString(16)} is not a MessagePack type (0xc1 is never used).`);
  }
}

function mpTimestamp(data: Uint8Array): string {
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (data.length === 4) return new Date(v.getUint32(0) * 1000).toISOString();
  if (data.length === 8) {
    const raw = v.getBigUint64(0);
    const ns = Number(raw >> 34n);
    const s = Number(raw & 0x3ffffffffn);
    return new Date(s * 1000 + ns / 1e6).toISOString();
  }
  const ns = v.getUint32(0);
  const s = Number(v.getBigInt64(4));
  return new Date(s * 1000 + ns / 1e6).toISOString();
}

function mpArr(r: Reader, n: number, depth: number): Out[] {
  const out: Out[] = [];
  for (let i = 0; i < n; i++) out.push(mp(r, depth + 1));
  return out;
}

function mpMap(r: Reader, n: number, depth: number): Record<string, Out> {
  const out: Record<string, Out> = {};
  for (let i = 0; i < n; i++) {
    const k = mp(r, depth + 1);
    const key = typeof k === 'string' ? k : `$key:${JSON.stringify(k)}`;
    putEntry(out, key, mp(r, depth + 1));
  }
  return out;
}

/* ---------------- CBOR (RFC 8949) ---------------- */

export function decodeCbor(bytes: Uint8Array): { value: Out; trailingBytes: number } {
  const r = new Reader(bytes);
  const value = cbor(r, 0);
  return { value, trailingBytes: bytes.length - r.pos };
}

function cborLen(r: Reader, info: number): number | bigint | null {
  if (info < 24) return info;
  if (info === 24) return r.u8();
  if (info === 25) return r.u16();
  if (info === 26) return r.u32();
  if (info === 27) return r.u64();
  if (info === 31) return null; // indefinite
  throw new Error(`Additional info ${info} is reserved in RFC 8949.`);
}

function half(h: number): number {
  const sign = h & 0x8000 ? -1 : 1;
  const exp = (h >> 10) & 0x1f;
  const frac = h & 0x3ff;
  if (exp === 0) return sign * frac * 2 ** -24;
  if (exp === 31) return frac ? NaN : sign * Infinity;
  return sign * (1024 + frac) * 2 ** (exp - 25);
}

function cbor(r: Reader, depth: number): Out {
  if (depth > 64) throw new Error('Nested deeper than 64 levels.');
  const ib = r.u8();
  const major = ib >> 5;
  const info = ib & 0x1f;
  switch (major) {
    case 0: { const n = cborLen(r, info); if (n === null) throw new Error('Indefinite integer is not a thing.'); return typeof n === 'bigint' ? bigOut(n) : n; }
    case 1: { const n = cborLen(r, info); if (n === null) throw new Error('Indefinite integer is not a thing.'); return typeof n === 'bigint' ? bigOut(-1n - n) : -1 - n; }
    case 2: case 3: {
      const text = major === 3;
      const n = cborLen(r, info);
      if (n === null) {
        // Chunks must be definite strings of the same major type (RFC 8949
        // §3.2.3); read their bytes directly so byte-string content joins
        // instead of passing through the display wrapper.
        const parts: Uint8Array[] = [];
        for (;;) {
          const next = r.u8();
          if (next === 0xff) break;
          if (next >> 5 !== major) throw new Error('Indefinite string chunks must be definite strings of the same kind.');
          const clen = cborLen(r, next & 0x1f);
          if (clen === null) throw new Error('Indefinite chunks cannot themselves be indefinite (RFC 8949 §3.2.3).');
          parts.push(r.bytes(Number(clen)));
        }
        const joined = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
        let o = 0;
        for (const p of parts) { joined.set(p, o); o += p.length; }
        return text ? new TextDecoder().decode(joined) : hexPreview(joined);
      }
      const len = Number(n);
      return text ? r.str(len) : hexPreview(r.bytes(len));
    }
    case 4: {
      const n = cborLen(r, info);
      const out: Out[] = [];
      if (n === null) {
        for (;;) {
          if (r.b[r.pos] === 0xff) { r.pos += 1; break; }
          out.push(cbor(r, depth + 1));
        }
      } else for (let i = 0; i < Number(n); i++) out.push(cbor(r, depth + 1));
      return out;
    }
    case 5: {
      const n = cborLen(r, info);
      const out: Record<string, Out> = {};
      const put = () => {
        const k = cbor(r, depth + 1);
        const key = typeof k === 'string' ? k : `$key:${JSON.stringify(k)}`;
        putEntry(out, key, cbor(r, depth + 1));
      };
      if (n === null) {
        for (;;) {
          if (r.b[r.pos] === 0xff) { r.pos += 1; break; }
          put();
        }
      } else for (let i = 0; i < Number(n); i++) put();
      return out;
    }
    case 6: {
      const tag = cborLen(r, info);
      const inner = cbor(r, depth + 1);
      const t = Number(tag);
      if (t === 0 && typeof inner === 'string') return { $tag: 0, datetime: inner };
      if (t === 1 && typeof inner === 'number') return { $tag: 1, epoch: inner, datetime: new Date(inner * 1000).toISOString() };
      return { $tag: t, value: inner };
    }
    case 7:
      if (info === 20) return false;
      if (info === 21) return true;
      if (info === 22) return null;
      if (info === 23) return { $undefined: true };
      if (info === 25) return half(r.u16());
      if (info === 26) return r.f32();
      if (info === 27) return r.f64();
      if (info < 20) return { $simple: info };
      if (info === 24) return { $simple: r.u8() };
      throw new Error(`Major 7 with info ${info} is reserved.`);
    default:
      throw new Error('unreachable');
  }
}
