/**
 * Decodes protobuf wire format without a schema: field numbers, wire types
 * and values, with nested messages detected by trying to decode
 * length-delimited fields recursively. Without the .proto file the wire
 * format is genuinely ambiguous — a length-delimited field can be a string,
 * bytes, a nested message or a packed repeated field — so every such field
 * reports what it could be rather than guessing silently, and varints show
 * both unsigned and zigzag readings. That honesty is the difference between
 * a decoder and a guesser; protoscope (the reference tool from the protobuf
 * team) draws the same line. Reference: protobuf.dev/programming-guides/encoding.
 *
 * Dependency-free on purpose: the CLI bundles it, and it backs the MCP tool.
 */

export type WireField = {
  fieldNumber: number;
  wireType: number;
  wireTypeName: string;
  /** Unsigned varint / fixed value, as decimal text (may exceed 2^53). */
  value?: string;
  /** The signed reading if this varint were sint32/64 (zigzag). */
  zigzag?: string;
  /** The signed reading if a fixed field were sfixed32/64. */
  asSigned?: string;
  /** Fixed 32/64 also shown as float/double, since the bits don't say. */
  asFloat?: number;
  bytes?: number;
  /** Printable preview when the payload looks like UTF-8 text. */
  text?: string;
  hex?: string;
  /** A valid sub-message decode, when the payload parses as one. */
  message?: WireField[];
};

const WIRE_NAMES: Record<number, string> = { 0: 'varint', 1: 'i64', 2: 'len', 3: 'group-start', 4: 'group-end', 5: 'i32' };

function readVarint(b: Uint8Array, p: number): [lo: bigint, next: number] {
  let v = 0n;
  let shift = 0n;
  for (let i = 0; i < 10; i++) {
    const byte = b[p + i];
    if (byte === undefined) throw new Error('Truncated varint');
    v |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return [v, p + i + 1];
    shift += 7n;
  }
  throw new Error('Varint longer than 10 bytes');
}

const printable = (b: Uint8Array): string | undefined => {
  if (!b.length) return '';
  try {
    const s = new TextDecoder('utf-8', { fatal: true }).decode(b);
    // Control characters other than \n\t mean it is not really text.
    if (/[\u0000-\u0008\u000b-\u001f]/.test(s)) return undefined;
    return s;
  } catch {
    return undefined;
  }
};

export function decodeProtoWire(bytes: Uint8Array, depth = 0): WireField[] {
  if (depth > 10) throw new Error('Nested too deep');
  const out: WireField[] = [];
  let p = 0;
  while (p < bytes.length) {
    const [tag, afterTag] = readVarint(bytes, p);
    const wireType = Number(tag & 7n);
    const fieldNumber = Number(tag >> 3n);
    if (fieldNumber === 0) throw new Error(`Field number 0 at byte ${p}: not valid protobuf.`);
    const f: WireField = { fieldNumber, wireType, wireTypeName: WIRE_NAMES[wireType] ?? `wire#${wireType}` };
    p = afterTag;
    if (wireType === 0) {
      const [v, next] = readVarint(bytes, p);
      f.value = v.toString();
      f.zigzag = ((v >> 1n) ^ -(v & 1n)).toString();
      p = next;
    } else if (wireType === 1) {
      if (p + 8 > bytes.length) throw new Error('Truncated i64 field');
      const dv = new DataView(bytes.buffer, bytes.byteOffset + p, 8);
      f.value = dv.getBigUint64(0, true).toString();
      const signed = dv.getBigInt64(0, true).toString();
      if (signed !== f.value) f.asSigned = signed;
      f.asFloat = dv.getFloat64(0, true);
      p += 8;
    } else if (wireType === 5) {
      if (p + 4 > bytes.length) throw new Error('Truncated i32 field');
      const dv = new DataView(bytes.buffer, bytes.byteOffset + p, 4);
      f.value = dv.getUint32(0, true).toString();
      const signed = dv.getInt32(0, true).toString();
      if (signed !== f.value) f.asSigned = signed;
      f.asFloat = dv.getFloat32(0, true);
      p += 4;
    } else if (wireType === 2) {
      const [len, next] = readVarint(bytes, p);
      const n = Number(len);
      if (next + n > bytes.length) throw new Error(`Length-delimited field of ${n} bytes runs past the end.`);
      const payload = bytes.subarray(next, next + n);
      f.bytes = n;
      f.text = printable(payload);
      f.hex = n <= 32 ? [...payload].map((x) => x.toString(16).padStart(2, '0')).join(' ') : undefined;
      if (n > 0) {
        try {
          f.message = decodeProtoWire(payload, depth + 1);
        } catch {
          /* not a message; the text/hex reading stands */
        }
      }
      p = next + n;
    } else if (wireType === 3 || wireType === 4) {
      // groups: deprecated since proto2's early days; note and stop.
      throw new Error(`Group wire type at field ${fieldNumber}: groups are deprecated and this decoder does not follow them.`);
    } else {
      throw new Error(`Wire type ${wireType} at field ${fieldNumber} does not exist.`);
    }
    out.push(f);
  }
  return out;
}

export function renderProtoWire(fields: WireField[], indent = ''): string {
  const lines: string[] = [];
  for (const f of fields) {
    if (f.wireType === 0) {
      const zig = f.zigzag !== f.value ? `  (as sint: ${f.zigzag})` : '';
      lines.push(`${indent}${f.fieldNumber}: varint ${f.value}${zig}`);
    } else if (f.wireType === 1 || f.wireType === 5) {
      const fl = Number.isFinite(f.asFloat) && f.asFloat !== 0 ? `  (as ${f.wireType === 1 ? 'double' : 'float'}: ${f.asFloat})` : '';
      const sg = f.asSigned ? `  (as sfixed: ${f.asSigned})` : '';
      lines.push(`${indent}${f.fieldNumber}: ${f.wireTypeName} ${f.value}${sg}${fl}`);
    } else {
      const what = f.message?.length ? 'message?' : f.text !== undefined ? 'string' : 'bytes';
      const preview = f.text !== undefined && !f.message?.length ? ` "${f.text.length > 60 ? `${f.text.slice(0, 60)}…` : f.text}"` : f.hex ? ` ${f.hex}` : '';
      lines.push(`${indent}${f.fieldNumber}: ${what} (${f.bytes} bytes)${preview}`);
      if (f.message?.length) {
        lines.push(...renderProtoWire(f.message, `${indent}  `).split('\n'));
        if (f.text !== undefined) lines.push(`${indent}  (also reads as text: "${f.text.length > 40 ? `${f.text.slice(0, 40)}…` : f.text}")`);
      }
    }
  }
  return lines.join('\n');
}
