import { PNG } from 'pngjs';
import { Gradient, GradientValidation, ValidationError } from '../types';

export const MIN_STOPS = 2;
export const MAX_STOPS = 10;
export const MAX_PIXELS = 16_777_216;
export const MAX_SIDE = 8192;
export const isValidHex = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());

export function validateGradient(
  value: Gradient,
  maxStops = MAX_STOPS,
): GradientValidation {
  const errors: ValidationError[] = [];
  const add = (field: string, message: string) =>
    errors.push({ field, message, severity: 'error' });
  if (!value || !['linear', 'radial', 'conic'].includes(value.type))
    add('type', 'Choose a gradient type');
  if (
    !Array.isArray(value?.stops) ||
    value.stops.length < MIN_STOPS ||
    value.stops.length > maxStops
  ) {
    add(
      'stops',
      Number.isFinite(maxStops)
        ? `Use ${MIN_STOPS}–${maxStops} color stops`
        : `Use at least ${MIN_STOPS} color stops`,
    );
  }
  if (Array.isArray(value?.stops))
    value.stops.forEach((stop, i) => {
      if (!isValidHex(stop))
        add(`stop-${i}`, 'Enter a color such as #ABC or #AABBCC');
    });
  if (
    value?.angle !== undefined &&
    (typeof value.angle !== 'number' ||
      !Number.isFinite(value.angle) ||
      value.angle < 0 ||
      value.angle > 360)
  ) {
    add('angle', 'Enter a finite angle between 0 and 360 degrees');
  }
  if (value?.label !== undefined && typeof value.label !== 'string')
    add('label', 'Label must be text');
  return {
    stops: errors.filter((e) => e.field.startsWith('stop')),
    angle: errors.filter((e) => e.field === 'angle'),
    overall: { isValid: errors.length === 0, errors, warnings: [] },
  };
}

export function assertGradient(
  value: unknown,
  maxStops = MAX_STOPS,
): asserts value is Gradient {
  const result = validateGradient(value as Gradient, maxStops);
  if (!result.overall.isValid)
    throw new Error(result.overall.errors.map((e) => e.message).join('; '));
}

// Older Preview allowed unlimited stops. Keep valid legacy gradients renderable;
// form creation and new library writes enforce the editor limit separately.
export function normaliseGradient(
  value: Gradient,
  maxStops = Infinity,
): Gradient {
  assertGradient(value, maxStops);
  return {
    ...value,
    stops: value.stops.map((c) => c.trim().toUpperCase()),
    label: value.label?.trim() || undefined,
  };
}

export function gradientFromForm(
  type: Gradient['type'],
  stops: string[],
  angle: string,
  label: string,
): Gradient {
  return normaliseGradient(
    {
      type,
      stops,
      angle:
        type === 'linear' ? (angle.trim() ? Number(angle) : NaN) : undefined,
      label,
    },
    MAX_STOPS,
  );
}

export const normaliseAngle = (angle = 90) => angle % 360;
export function linearGeometry(angle: number, width: number, height: number) {
  const theta = (normaliseAngle(angle) * Math.PI) / 180;
  const dx = Math.sin(theta),
    dy = -Math.cos(theta);
  const length = Math.abs(width * dx) + Math.abs(height * dy);
  return {
    dx,
    dy,
    length,
    x1: width / 2 - (dx * length) / 2,
    y1: height / 2 - (dy * length) / 2,
    x2: width / 2 + (dx * length) / 2,
    y2: height / 2 + (dy * length) / 2,
  };
}

export function dimensions(width: number, height: number, dpr = 1) {
  if (
    ![width, height, dpr].every((n) => Number.isSafeInteger(n) && n > 0) ||
    dpr > 2
  )
    throw new Error(
      'Width and height must be positive whole numbers; DPR must be 1 or 2',
    );
  const w = width * dpr,
    h = height * dpr;
  if (w > MAX_SIDE || h > MAX_SIDE || w * h > MAX_PIXELS)
    throw new Error(
      `Output must fit within ${MAX_SIDE} pixels per side and ${MAX_PIXELS.toLocaleString('en-GB')} total pixels, including DPR`,
    );
  return { width: w, height: h };
}

function cssImage(gradient: Gradient): string {
  const g = normaliseGradient(gradient),
    colors = g.stops.join(', ');
  if (g.type === 'linear')
    return `linear-gradient(${normaliseAngle(g.angle)}deg in srgb, ${colors})`;
  if (g.type === 'radial')
    return `radial-gradient(ellipse farthest-corner at center in srgb, ${colors})`;
  return `conic-gradient(from 0deg at center in srgb, ${colors})`;
}
export const toCss = (g: Gradient) => `background: ${cssImage(g)};`;
export const toTailwind = (g: Gradient, mode: 'utility' | 'css' = 'utility') =>
  mode === 'css' ? toCss(g) : `bg-[${cssImage(g).replaceAll(' ', '_')}]`;

function rgb(hex: string): number[] {
  const text = hex.trim().slice(1);
  const full = text.length === 3 ? [...text].map((c) => c + c).join('') : text;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

// Copyable, complete view. Canvas keeps angle geometry in physical coordinates,
// including non-square frames. No external Color(hex:) extension is needed.
export function toSwiftUI(gradient: Gradient): string {
  const g = normaliseGradient(gradient);
  const colors = g.stops
    .map(
      (c) =>
        `Color(.sRGB, red: ${(rgb(c)[0] / 255).toFixed(8)}, green: ${(rgb(c)[1] / 255).toFixed(8)}, blue: ${(rgb(c)[2] / 255).toFixed(8)}, opacity: 1)`,
    )
    .join(',\n                ');
  const geometry = linearGeometry(g.angle ?? 90, 1, 1);
  const drawing =
    g.type === 'linear'
      ? `let dx: CGFloat = ${geometry.dx.toFixed(12)}
            let dy: CGFloat = ${geometry.dy.toFixed(12)}
            let length = abs(size.width * dx) + abs(size.height * dy)
            let start = CGPoint(x: size.width / 2 - dx * length / 2, y: size.height / 2 - dy * length / 2)
            let end = CGPoint(x: size.width / 2 + dx * length / 2, y: size.height / 2 + dy * length / 2)
            context.fill(rect, with: .linearGradient(gradient, startPoint: start, endPoint: end))`
      : g.type === 'radial'
        ? `// Scale a unit circle to the CSS farthest-corner ellipse.
            context.scaleBy(x: size.width / 2, y: size.height / 2)
            let bounds = Path(CGRect(x: 0, y: 0, width: 2, height: 2))
            context.fill(bounds, with: .radialGradient(gradient, center: CGPoint(x: 1, y: 1), startRadius: 0, endRadius: sqrt(2)))`
        : `context.fill(rect, with: .conicGradient(gradient, center: CGPoint(x: size.width / 2, y: size.height / 2), angle: .degrees(-90)))`;
  return `import SwiftUI

// macOS 12+ / iOS 15+. Use GeneratedGradient().frame(width: 800, height: 480).
struct GeneratedGradient: View {
    var body: some View {
        Canvas(opaque: true, colorMode: .nonLinear) { context, size in
            guard size.width > 0, size.height > 0 else { return }
            let gradient = Gradient(colors: [
                ${colors}
            ])
            ${g.type !== 'radial' ? 'let rect = Path(CGRect(origin: .zero, size: size))\n            ' : ''}${drawing}
        }
    }
}`;
}

export function toSvg(gradient: Gradient, width = 800, height = 480): string {
  const g = normaliseGradient(gradient);
  dimensions(width, height);
  if (g.type === 'conic')
    throw new Error(
      'Conic gradients are not supported by portable SVG. Export PNG or copy CSS instead.',
    );
  const stops = g.stops
    .map(
      (c, i) =>
        `<stop offset="${i / (g.stops.length - 1)}" stop-color="${c}"/>`,
    )
    .join('');
  const line = linearGeometry(g.angle ?? 90, width, height);
  const definition =
    g.type === 'linear'
      ? `<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}">${stops}</linearGradient>`
      : `<radialGradient id="g" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${width / 2} ${height / 2}) scale(${width / Math.sqrt(2)} ${height / Math.sqrt(2)})">${stops}</radialGradient>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" color-interpolation="sRGB"><defs>${definition}</defs><rect width="${width}" height="${height}" fill="url(#g)"/></svg>`;
}

function renderer(
  gradient: Gradient,
  width: number,
  height: number,
  dpr: number,
) {
  const g = normaliseGradient(gradient);
  const size = dimensions(width, height, dpr);
  const png = new PNG(size);
  const colors = g.stops.map(rgb);
  const { dx, dy, length } = linearGeometry(
    g.angle ?? 90,
    size.width,
    size.height,
  );
  function rows(from: number, to: number) {
    for (let y = from; y < to; y++)
      for (let x = 0; x < size.width; x++) {
        // Sample pixel centres in CSS box coordinates.
        const px = x + 0.5 - size.width / 2,
          py = y + 0.5 - size.height / 2;
        let t =
          g.type === 'linear'
            ? 0.5 + (px * dx + py * dy) / length
            : g.type === 'radial'
              ? Math.hypot(
                  px / (size.width / Math.sqrt(2)),
                  py / (size.height / Math.sqrt(2)),
                )
              : ((Math.atan2(py, px) + Math.PI / 2 + 2 * Math.PI) %
                  (2 * Math.PI)) /
                (2 * Math.PI);
        t = Math.max(0, Math.min(1, t));
        const scaled = t * (colors.length - 1),
          i = Math.min(colors.length - 2, Math.floor(scaled)),
          blend = scaled - i;
        const offset = (y * size.width + x) * 4;
        for (let c = 0; c < 3; c++)
          png.data[offset + c] = Math.round(
            colors[i][c] + (colors[i + 1][c] - colors[i][c]) * blend,
          );
        png.data[offset + 3] = 255;
      }
  }
  return { png, rows, height: size.height };
}

export function generatePng(
  g: Gradient,
  width: number,
  height: number,
  dpr = 1,
): Buffer {
  const r = renderer(g, width, height, dpr);
  r.rows(0, r.height);
  return PNG.sync.write(r.png);
}

// Yield between row batches; stream compression avoids blocking the UI during large exports.
export async function generatePngAsync(
  g: Gradient,
  width: number,
  height: number,
  dpr = 1,
): Promise<Buffer> {
  const r = renderer(g, width, height, dpr);
  for (let y = 0; y < r.height; y += 32) {
    r.rows(y, Math.min(y + 32, r.height));
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    r.png.on('data', (chunk: Buffer) => chunks.push(chunk));
    r.png.on('end', () => resolve(Buffer.concat(chunks)));
    r.png.on('error', reject);
    r.png.pack();
  });
}

export const pngDataUri = (g: Gradient, width = 800, height = 480) =>
  `data:image/png;base64,${generatePng(g, width, height).toString('base64')}`;
export const randomHex = () =>
  `#${Math.floor(Math.random() * 0x1000000)
    .toString(16)
    .padStart(6, '0')
    .toUpperCase()}`;
export const PNG_SIZE_PRESETS = [
  { name: 'HD (1600×1000)', width: 1600, height: 1000 },
  { name: 'Full HD (1920×1080)', width: 1920, height: 1080 },
  { name: '2K (2560×1440)', width: 2560, height: 1440 },
  { name: '4K (3840×2160)', width: 3840, height: 2160 },
] as const;
