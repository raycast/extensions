import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateConversion,
  normalizeHex,
  simulateChannel,
} from "../src/lib/color.ts";

test("normalizes short and long HEX values", () => {
  assert.equal(normalizeHex(" #abc "), "#AABBCC");
  assert.equal(normalizeHex("7a213e"), "#7A213E");
  assert.equal(normalizeHex("#12"), null);
  assert.equal(normalizeHex("#GGGGGG"), null);
});

test("calculates the expected stable conversion for a dark blue-gray target", () => {
  const conversion = calculateConversion("#7A213E", "#1D262D");

  assert.ok(conversion);
  assert.deepEqual(conversion.sourceRgb, { r: 122, g: 33, b: 62 });
  assert.deepEqual(conversion.targetRgb, { r: 29, g: 38, b: 45 });
  assert.deepEqual(conversion.predictedRgb, { r: 29, g: 38, b: 45 });
  assert.deepEqual(
    conversion.channels.map(({ red, green, blue, constant }) => ({
      red,
      green,
      blue,
      constant,
    })),
    [
      { red: 13.8, green: 27.1, blue: 5.3, constant: 0 },
      { red: 18.1, green: 35.5, blue: 6.9, constant: 0 },
      { red: 21.4, green: 42, blue: 8.2, constant: 0 },
    ],
  );
});

test("uses Constant for a black source that must become white", () => {
  const conversion = calculateConversion("#000000", "#FFFFFF");

  assert.ok(conversion);
  assert.deepEqual(conversion.predictedRgb, { r: 255, g: 255, b: 255 });
  assert.deepEqual(
    conversion.channels.map((channel) => channel.constant),
    [100, 100, 100],
  );
});

test("simulates a channel using percentages and Constant", () => {
  assert.equal(
    simulateChannel(
      { r: 100, g: 50, b: 25 },
      {
        output: "r",
        red: 50,
        green: 25,
        blue: 0,
        constant: 10,
        targetValue: 0,
      },
    ),
    88,
  );
});
