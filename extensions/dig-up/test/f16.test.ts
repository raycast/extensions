// Half floats by hand (Node 22 has no Float16Array), checked against values Swift's Float16 cast gives, an
// independent nearest-even search over every half, and DigUp's RulesTests.halfVectorsConvertBackExactly.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  HALF_TO_FLOAT,
  VECTOR_BYTES,
  copyHalvesInto,
  decodeVector,
  floatToHalf,
  halfToFloat,
  packHalves,
  unpackHalves,
} from "../engine/f16";
import { DIMENSION } from "../engine/types";

const hex = (value: number) => "0x" + value.toString(16).padStart(4, "0");

describe("floatToHalf", () => {
  test("known values", () => {
    const cases: Array<[number, number]> = [
      [1, 0x3c00],
      [0.5, 0x3800],
      [-2, 0xc000],
      [0.1, 0x2e66],
      [1 / 3, 0x3555],
      [65504, 0x7bff], // the largest half
      [65519.99, 0x7bff], // rounds down to it
      [65520, 0x7c00], // halfway to the next power: infinity
      [6.103515625e-5, 0x0400], // the smallest normal
      [5.960464477539063e-8, 0x0001], // the smallest subnormal
      [2 ** -25, 0x0000], // half of it: ties to even, 0
      [2 ** -25 * 1.5, 0x0001],
      [3 * 2 ** -25, 0x0002], // 1.5 subnormal steps: ties to even, 2
      [2049, 0x6800], // halfway between 2048 and 2050: even
      [2051, 0x6802], // halfway between 2050 and 2052: even
      [1 + 2 ** -11, 0x3c00],
      [1 + 3 * 2 ** -11, 0x3c02],
      [0, 0x0000],
      [-0, 0x8000],
      [Infinity, 0x7c00],
      [-Infinity, 0xfc00],
      [1e-10, 0x0000],
      [-1e-10, 0x8000],
      [1e10, 0x7c00],
    ];
    for (const [value, half] of cases) assert.equal(hex(floatToHalf(value)), hex(half), `${value}`);
  });

  test("NaN stays a quiet NaN", () => {
    assert.equal(hex(floatToHalf(NaN)), "0x7e00");
    assert.ok(Number.isNaN(halfToFloat(floatToHalf(NaN))));
  });

  test("every half converts back to itself", () => {
    for (let half = 0; half < 65536; half++) {
      const value = HALF_TO_FLOAT[half];
      if (Number.isNaN(value)) continue;
      assert.equal(floatToHalf(value), half, hex(half));
    }
  });

  test("rounds to the nearest half, ties to even (against a search over all halves)", () => {
    // The finite non-negative halves in order of value: bit patterns 0x0000...0x7bff, then infinity.
    const values = Array.from({ length: 0x7c01 }, (_, half) => halfToFloat(half));
    const nearest = (value: number): number => {
      const magnitude = Math.abs(Math.fround(value));
      let low = 0;
      let high = 0x7c00;
      while (low < high) {
        const middle = (low + high) >> 1;
        if (values[middle] < magnitude) low = middle + 1;
        else high = middle;
      }
      // values[low] >= magnitude > values[low - 1]
      let pick = low;
      if (low > 0 && values[low] !== magnitude) {
        const above = values[low] === Infinity ? 65536 : values[low]; // past 65504 the next step would be 2^16
        const below = values[low - 1];
        const up = above - magnitude;
        const down = magnitude - below;
        pick = down < up || (down === up && (low - 1) % 2 === 0) ? low - 1 : low;
      }
      return (value < 0 || Object.is(value, -0) ? 0x8000 : 0) | pick;
    };
    let state = 0x2545f491;
    const random = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return state >>> 0;
    };
    const f32 = new Float32Array(1);
    const u32 = new Uint32Array(f32.buffer);
    for (let i = 0; i < 200_000; i++) {
      // Exponents around the half range, random mantissa and sign.
      const exponent = 95 + (random() % 50);
      u32[0] = ((random() & 1) << 31) | (exponent << 23) | (random() & 0x7fffff);
      const value = f32[0];
      assert.equal(hex(floatToHalf(value)), hex(nearest(value)), `${value}`);
    }
  });
});

describe("stored vectors", () => {
  test("half vectors convert back exactly (DigUp: halfVectorsConvertBackExactly)", () => {
    const vector = Array.from({ length: DIMENSION }, (_, i) => Math.fround(Math.sin(i * 0.37)) * 0.05);
    const blob = packHalves(vector);
    assert.equal(blob.byteLength, VECTOR_BYTES);
    const back = decodeVector(blob);
    assert.deepEqual(
      Array.from(back),
      vector.map((value) => Math.fround(halfToFloat(floatToHalf(value)))),
    );
    // Into row 1 of a two-row matrix: row 0 is left alone.
    const matrix = new Uint16Array(2 * DIMENSION);
    copyHalvesInto(matrix, 1, blob);
    assert.equal(matrix[0], 0);
    assert.deepEqual(Array.from(matrix.subarray(DIMENSION)), Array.from(unpackHalves(blob)));
  });

  test("little-endian, and read from any byte offset", () => {
    const blob = packHalves([1, -2]);
    assert.deepEqual(Array.from(blob), [0x00, 0x3c, 0x00, 0xc0]);
    const shifted = new Uint8Array(blob.byteLength + 1);
    shifted.set(blob, 1);
    const unaligned = shifted.subarray(1);
    assert.equal(unaligned.byteOffset, 1);
    assert.deepEqual(Array.from(unpackHalves(unaligned)), [0x3c00, 0xc000]);
    assert.deepEqual(Array.from(decodeVector(unaligned)), [1, -2]);
    const matrix = new Uint16Array(DIMENSION);
    const row = new Uint8Array(VECTOR_BYTES + 1).subarray(1);
    row.set(packHalves(new Array(DIMENSION).fill(0.25)));
    copyHalvesInto(matrix, 0, row);
    assert.ok(matrix.every((half) => half === 0x3400));
  });
});
