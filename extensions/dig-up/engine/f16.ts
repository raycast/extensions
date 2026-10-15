// IEEE 754 binary16 by hand: Node 22 has no Float16Array. Vectors are stored and held in memory as 768 halves
// (1,536 bytes), little-endian as Swift writes `[Float16]` on Apple Silicon (DigUp: Vectors.swift), and scored as
// float32.

import { DIMENSION } from "./types";

/** Bytes of one stored vector. */
export const VECTOR_BYTES = DIMENSION * 2;

const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);

/** Float16(Float(value)) as Swift casts it: rounded to float32 first, then to the nearest half, ties to even.
 *  Overflow gives ±infinity, tiny values ±0 or a subnormal; NaN stays a (quiet) NaN. */
export function floatToHalf(value: number): number {
  f32[0] = value;
  const bits = u32[0];
  const sign = (bits >>> 16) & 0x8000;
  const exponent = (bits >>> 23) & 0xff;
  const mantissa = bits & 0x7fffff;
  if (exponent === 0xff) return sign | 0x7c00 | (mantissa === 0 ? 0 : 0x200 | (mantissa >>> 13));
  const halfExponent = exponent - 127 + 15;
  if (halfExponent >= 0x1f) return sign | 0x7c00;
  if (halfExponent <= 0) {
    // A subnormal half: value = full × 2^(exponent − 150) = (full >> shift) × 2^−24.
    const shift = 126 - exponent;
    if (shift > 24) return sign; // below half the smallest subnormal (also float32 zeros and subnormals)
    const full = mantissa | 0x800000;
    let half = full >>> shift;
    const rest = full & ((1 << shift) - 1);
    const midway = 1 << (shift - 1);
    if (rest > midway || (rest === midway && (half & 1) === 1)) half++;
    return sign | half; // a carry into 0x400 is the smallest normal, as it should be
  }
  let half = (halfExponent << 10) | (mantissa >>> 13);
  const rest = mantissa & 0x1fff;
  if (rest > 0x1000 || (rest === 0x1000 && (half & 1) === 1)) half++; // a carry may roll into infinity: right too
  return sign | half;
}

/** The value of a half's bit pattern. */
export function halfToFloat(half: number): number {
  const sign = half & 0x8000 ? -1 : 1;
  const exponent = (half >>> 10) & 0x1f;
  const mantissa = half & 0x3ff;
  if (exponent === 0) return sign * mantissa * 2 ** -24;
  if (exponent === 0x1f) return mantissa === 0 ? sign * Infinity : NaN;
  return sign * (1 + mantissa / 1024) * 2 ** (exponent - 15);
}

/** Every half's float32 value, indexed by its bit pattern. */
export const HALF_TO_FLOAT: Float32Array = (() => {
  const table = new Float32Array(65536);
  for (let half = 0; half < 65536; half++) table[half] = halfToFloat(half);
  return table;
})();

/** A vector as stored: its halves, little-endian (DigUp: Vectors.half). */
export function packHalves(vector: ArrayLike<number>): Uint8Array {
  const bytes = new Uint8Array(vector.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < vector.length; i++) view.setUint16(i * 2, floatToHalf(vector[i]), true);
  return bytes;
}

/** A stored vector's halves, copied: a BLOB from SQLite may start at an odd byte offset. */
export function unpackHalves(blob: Uint8Array): Uint16Array {
  const halves = new Uint16Array(blob.byteLength >>> 1);
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  for (let i = 0; i < halves.length; i++) halves[i] = view.getUint16(i * 2, true);
  return halves;
}

/** A stored vector as float32s. */
export function decodeVector(blob: Uint8Array): Float32Array {
  const halves = unpackHalves(blob);
  const out = new Float32Array(halves.length);
  for (let i = 0; i < halves.length; i++) out[i] = HALF_TO_FLOAT[halves[i]];
  return out;
}

/** Copies a stored vector's bytes into row `row` of a matrix of halves (row-major, `DIMENSION` per row). */
export function copyHalvesInto(matrix: Uint16Array, row: number, blob: Uint8Array): void {
  const offset = matrix.byteOffset + row * VECTOR_BYTES;
  new Uint8Array(matrix.buffer, offset, VECTOR_BYTES).set(blob.subarray(0, VECTOR_BYTES));
}
