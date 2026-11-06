import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { PNG } from 'pngjs';
import {
  dimensions,
  generatePng,
  generatePngAsync,
  gradientFromForm,
  isValidHex,
  linearGeometry,
  MAX_STOPS,
  toCss,
  toSvg,
  toSwiftUI,
  toTailwind,
  validateGradient,
} from '../src/lib/grad';
import { Gradient } from '../src/types';
const gradient: Gradient = {
  type: 'linear',
  angle: 90,
  stops: ['#000', '#FFF'],
};
const red = (png: PNG, x: number, y: number) =>
  png.data[(y * png.width + x) * 4];

test('form preserves the label and validates actual color fields, angle, type and stop bounds', () => {
  assert.equal(
    gradientFromForm('linear', [' #abc ', '#AABBCC'], '360', ' Hero ').label,
    'Hero',
  );
  assert.equal(isValidHex('#1234'), false);
  for (const angle of ['', 'NaN', 'Infinity', '-1', '361'])
    assert.throws(() => gradientFromForm('linear', gradient.stops, angle, ''));
  for (const angle of [0, 360, 12.5])
    assert.equal(
      validateGradient({ ...gradient, angle }).overall.isValid,
      true,
    );
  const result = validateGradient({ ...gradient, stops: ['no', '#fffffg'] });
  assert.deepEqual(
    result.overall.errors.map((e) => e.field),
    ['stop-0', 'stop-1'],
  );
  assert.equal(
    validateGradient({ ...gradient, stops: Array(MAX_STOPS).fill('#ABC') })
      .overall.isValid,
    true,
  );
  assert.equal(
    validateGradient({ ...gradient, stops: Array(MAX_STOPS + 1).fill('#ABC') })
      .overall.isValid,
    false,
  );
  for (const value of [
    null,
    {},
    { ...gradient, angle: null },
    { ...gradient, type: 'invalid' },
    { ...gradient, stops: ['#000'] },
  ]) {
    assert.throws(() => toCss(value as Gradient));
    assert.throws(() => generatePng(value as Gradient, 2, 2));
    assert.throws(() => toSwiftUI(value as Gradient));
    assert.throws(() => toSvg(value as Gradient));
  }
});

test('dimensions enforce finite integers, DPR and the combined memory budget before allocation', () => {
  for (const [w, h, d] of [
    [NaN, 1, 1],
    [Infinity, 1, 1],
    [0, 1, 1],
    [1.5, 1, 1],
    [1, 1, 1.5],
    [1, 1, 3],
    [8193, 1, 1],
    [3840, 2160, 2],
  ])
    assert.throws(() => dimensions(w, h, d));
  assert.deepEqual(dimensions(4096, 4096), { width: 4096, height: 4096 });
  const png = PNG.sync.read(generatePng(gradient, 7, 3, 2));
  assert.equal(png.width, 14);
  assert.equal(png.height, 6);
  for (let i = 3; i < png.data.length; i += 4) assert.equal(png.data[i], 255);
});

test('linear cardinals and wrap use CSS box geometry on a rectangle', () => {
  const right = PNG.sync.read(generatePng(gradient, 8, 4));
  assert.equal(red(right, 0, 0), 16);
  assert.equal(red(right, 7, 0), 239);
  const up = PNG.sync.read(generatePng({ ...gradient, angle: 0 }, 8, 4));
  assert.equal(red(up, 0, 0), 223);
  assert.equal(red(up, 7, 3), 32);
  const down = PNG.sync.read(generatePng({ ...gradient, angle: 180 }, 8, 4));
  assert.equal(red(down, 0, 0), 32);
  assert.equal(red(down, 7, 3), 223);
  const left = PNG.sync.read(generatePng({ ...gradient, angle: 270 }, 8, 4));
  assert.equal(red(left, 0, 0), 239);
  assert.equal(red(left, 7, 0), 16);
  assert.deepEqual(
    generatePng({ ...gradient, angle: 0 }, 8, 4),
    generatePng({ ...gradient, angle: 360 }, 8, 4),
  );
  const line = linearGeometry(45, 8, 4);
  assert.ok(Math.abs(line.x1 - 1) < 1e-10);
  assert.ok(Math.abs(line.y1 - 5) < 1e-10);
  assert.ok(Math.abs(line.x2 - 7) < 1e-10);
  assert.ok(Math.abs(line.y2 + 1) < 1e-10);
  const svg = toSvg({ ...gradient, angle: 45 }, 8, 4);
  assert.match(svg, /gradientUnits="userSpaceOnUse"/);
  assert.match(svg, /color-interpolation="sRGB"/);
});

test('conic seam is at the top and advances clockwise', () => {
  const png = PNG.sync.read(generatePng({ ...gradient, type: 'conic' }, 9, 9));
  assert.equal(red(png, 4, 0), 0);
  assert.equal(red(png, 8, 4), 64);
  assert.equal(red(png, 4, 8), 128);
  assert.equal(red(png, 0, 4), 191);
  assert.ok(red(png, 3, 0) > 240);
  assert.ok(red(png, 5, 0) < 16);
  assert.throws(() => toSvg({ ...gradient, type: 'conic' }), /not supported/);
});

test('radial is the CSS farthest-corner ellipse, including non-square output', () => {
  const png = PNG.sync.read(generatePng({ ...gradient, type: 'radial' }, 9, 5));
  assert.equal(red(png, 4, 2), 0);
  assert.equal(red(png, 4, 0), Math.round((255 * 2) / (5 / Math.sqrt(2))));
  assert.equal(red(png, 0, 2), Math.round((255 * 4) / (9 / Math.sqrt(2))));
  assert.match(
    toCss({ ...gradient, type: 'radial' }),
    /ellipse farthest-corner/,
  );
});

test('sRGB interpolation, equally spaced stops and async export agree', async () => {
  const g: Gradient = {
    type: 'linear',
    angle: 90,
    stops: ['#F00', '#0F0', '#00F'],
  };
  const png = PNG.sync.read(generatePng(g, 5, 1));
  assert.deepEqual([...png.data.subarray(8, 12)], [0, 255, 0, 255]);
  assert.deepEqual(
    PNG.sync.read(await generatePngAsync(g, 5, 1)).data,
    png.data,
  );
  assert.match(toCss(g), /in srgb/);
  assert.equal(toTailwind(g, 'css'), toCss(g));
  assert.equal(
    toTailwind(g),
    `bg-[${toCss(g).slice(12, -1).replaceAll(' ', '_')}]`,
  );
});

test('SwiftUI is self-contained, uses exact angles and includes aspect-aware geometry', () => {
  const swift = toSwiftUI({ ...gradient, angle: 13 });
  assert.match(swift, /import SwiftUI/);
  assert.match(swift, /struct GeneratedGradient: View/);
  assert.match(swift, /Color\(\.sRGB/);
  assert.doesNotMatch(swift, /Color\(hex:/);
  assert.match(swift, /0\.224951054344/);
  assert.match(swift, /abs\(size.width \* dx\)/);
  assert.equal(
    toSwiftUI({ ...gradient, angle: 0 }),
    toSwiftUI({ ...gradient, angle: 360 }),
  );
  assert.match(toSwiftUI({ ...gradient, type: 'conic' }), /degrees\(-90\)/);
});
