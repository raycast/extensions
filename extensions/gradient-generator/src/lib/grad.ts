import { Gradient } from '../types';
import { PNG } from 'pngjs';

const clampAngle = (angle?: number): number => {
  if (typeof angle !== 'number' || Number.isNaN(angle)) return 90;
  if (angle < 0) return 0;
  if (angle > 360) return 360;
  return angle;
};

export const toCss = ({ type, angle, stops }: Gradient): string => {
  const safeAngle = clampAngle(angle);
  const gradientBody =
    type === 'linear'
      ? `linear-gradient(${safeAngle}deg, ${stops.join(', ')})`
      : type === 'radial'
        ? `radial-gradient(${stops.join(', ')})`
        : `conic-gradient(${stops.join(', ')})`;
  return `background: ${gradientBody};`;
};

export const toSwiftUI = ({ type, angle, stops }: Gradient): string => {
  const colors = stops.map((c) => `Color(hex: "${c}")`).join(', ');
  if (type === 'linear') {
    const safeAngle = clampAngle(angle);
    // Convert degrees to approximate UnitPoint based on common angles
    // For MVP, map angle to start/end presets
    const mapping: Record<number, { start: string; end: string }> = {
      0: { start: '.leading', end: '.trailing' },
      45: { start: '.bottomLeading', end: '.topTrailing' },
      90: { start: '.bottom', end: '.top' },
      135: { start: '.bottomTrailing', end: '.topLeading' },
      180: { start: '.trailing', end: '.leading' },
      225: { start: '.topTrailing', end: '.bottomLeading' },
      270: { start: '.top', end: '.bottom' },
      315: { start: '.topLeading', end: '.bottomTrailing' },
    };
    const keys = Object.keys(mapping)
      .map((k) => Number(k))
      .sort((a, b) => Math.abs(a - safeAngle) - Math.abs(b - safeAngle));
    const { start, end } = mapping[keys[0] ?? 90];
    return `LinearGradient(gradient: Gradient(colors: [${colors}]), startPoint: ${start}, endPoint: ${end})`;
  }
  if (type === 'radial') {
    return `RadialGradient(gradient: Gradient(colors: [${colors}]), center: .center, startRadius: 0, endRadius: 200)`;
  }
  return `AngularGradient(gradient: Gradient(colors: [${colors}]), center: .center)`;
};

export const toTailwind = ({ type, angle, stops }: Gradient): string => {
  const safeAngle = clampAngle(angle);
  if (type === 'linear') {
    return `bg-[linear-gradient(${safeAngle}deg,_${stops.join(',_')})]`;
  }
  if (type === 'radial') {
    return `bg-[radial-gradient(${stops.join(',_')})]`;
  }
  return `bg-[conic-gradient(${stops.join(',_')})]`;
};

export const svgDataUri = ({ type, angle, stops }: Gradient): string => {
  const safeAngle = clampAngle(angle);

  const buildStops = () => {
    const total = Math.max(2, stops.length);
    return stops
      .map((color, index) => {
        const offset = (index / (total - 1)) * 100;
        return `<stop offset='${offset.toFixed(2)}%' stop-color='${color}' />`;
      })
      .join('');
  };

  // Base SVG/head
  const svgHead =
    "<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='800' height='400' viewBox='0 0 800 400'>";

  let defs = '';
  let body = '';

  if (type === 'linear') {
    // In CSS, 0deg points up. Our base gradient is left->right, which is CSS 90deg.
    // Rotate by (safeAngle - 90) around the center of the object bounding box.
    const rotation = safeAngle - 90;
    defs = `<defs>
      <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='0%' gradientUnits='objectBoundingBox' gradientTransform='rotate(${rotation}, 0.5, 0.5)'>
        ${buildStops()}
      </linearGradient>
    </defs>`;
    body = `<rect width='100%' height='100%' fill='url(#g)' />`;
  } else if (type === 'radial') {
    defs = `<defs>
      <radialGradient id='g' cx='50%' cy='50%' r='75%'>
        ${buildStops()}
      </radialGradient>
    </defs>`;
    body = `<rect width='100%' height='100%' fill='url(#g)' />`;
  } else {
    // Conic: try foreignObject with HTML/CSS conic-gradient. Provide radial fallback underneath.
    const fallbackDefs = `<defs>
      <radialGradient id='fallback' cx='50%' cy='50%' r='75%'>
        ${buildStops()}
      </radialGradient>
    </defs>`;
    const html = `<foreignObject width='100%' height='100%'>
      <div xmlns='http://www.w3.org/1999/xhtml' style='width:100%;height:100%;background: conic-gradient(${stops.join(
        ', ',
      )});'></div>
    </foreignObject>`;
    defs = fallbackDefs;
    body = `<rect width='100%' height='100%' fill='url(#fallback)' />${html}`;
  }

  const svg = `${svgHead}${defs}${body}</svg>`;

  // Encode
  let base64 = '';
  try {
    const g = globalThis as unknown as {
      btoa?: (s: string) => string;
      Buffer?: {
        from(data: string, enc: string): { toString(enc: string): string };
      };
    };
    const btoaFn = g.btoa;
    if (typeof btoaFn === 'function') {
      base64 = btoaFn(unescape(encodeURIComponent(svg)));
    } else if (g.Buffer) {
      base64 = g.Buffer.from(svg, 'utf8').toString('base64');
    }
  } catch {
    // noop
  }
  return `data:image/svg+xml;base64,${base64}`;
};

export const svgMarkup = ({ type, angle, stops }: Gradient): string => {
  const safeAngle = clampAngle(angle);

  const buildStops = () => {
    const total = Math.max(2, stops.length);
    return stops
      .map((color, index) => {
        const offset = (index / (total - 1)) * 100;
        return `<stop offset='${offset.toFixed(2)}%' stop-color='${color}' />`;
      })
      .join('');
  };

  const svgHead =
    "<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='800' height='400' viewBox='0 0 800 400'>";
  let defs = '';
  let body = '';

  if (type === 'linear') {
    const rotation = safeAngle - 90;
    defs = `<defs>
      <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='0%' gradientUnits='objectBoundingBox' gradientTransform='rotate(${rotation}, 0.5, 0.5)'>
        ${buildStops()}
      </linearGradient>
    </defs>`;
    body = `<rect width='100%' height='100%' fill='url(#g)' />`;
  } else if (type === 'radial') {
    defs = `<defs>
      <radialGradient id='g' cx='50%' cy='50%' r='75%'>
        ${buildStops()}
      </radialGradient>
    </defs>`;
    body = `<rect width='100%' height='100%' fill='url(#g)' />`;
  } else {
    const fallbackDefs = `<defs>
      <radialGradient id='fallback' cx='50%' cy='50%' r='75%'>
        ${buildStops()}
      </radialGradient>
    </defs>`;
    const html = `<foreignObject width='100%' height='100%'>
      <div xmlns='http://www.w3.org/1999/xhtml' style='width:100%;height:100%;background: conic-gradient(${stops.join(
        ', ',
      )});'></div>
    </foreignObject>`;
    defs = fallbackDefs;
    body = `<rect width='100%' height='100%' fill='url(#fallback)' />${html}`;
  }

  return `${svgHead}${defs}${body}</svg>`;
};

export const randomHex = (): string => {
  const n = Math.floor(Math.random() * 0xffffff);
  const s = n.toString(16).padStart(6, '0');
  return `#${s.toUpperCase()}`;
};

// Minimal SwiftUI Color(hex:) helper reference for documentation (not used at runtime)
export const swiftUIColorHexDoc = `// Add this small extension in your app:
// import SwiftUI
// extension Color {
//   init(hex: String) {
//     let scanner = Scanner(string: hex.replacingOccurrences(of: "#", with: ""))
//     var rgb: UInt64 = 0
//     scanner.scanHexInt64(&rgb)
//     let r = Double((rgb >> 16) & 0xFF) / 255.0
//     let g = Double((rgb >> 8) & 0xFF) / 255.0
//     let b = Double(rgb & 0xFF) / 255.0
//     self = Color(red: r, green: g, blue: b)
//   }
// }`;

// --- PNG renderer for Raycast Detail markdown ---
type RGB = { r: number; g: number; b: number };

const parseHex = (hex: string): RGB => {
  const s = hex.trim().replace('#', '');
  const v =
    s.length === 3
      ? s
          .split('')
          .map((c) => c + c)
          .join('')
      : s;
  const num = parseInt(v, 16);

  // Validate that the parsed number is not NaN and provide fallback
  if (Number.isNaN(num)) {
    return { r: 0, g: 0, b: 0 }; // Default to black for invalid hex
  }

  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

const interpolateStops = (stops: string[], t: number): RGB => {
  const n = Math.max(2, stops.length);
  const positions = Array.from({ length: n }, (_, i) => i / (n - 1));
  const idx = Math.min(n - 2, Math.max(0, Math.floor(t * (n - 1))));
  const t0 = positions[idx];
  const t1 = positions[idx + 1];
  const local = (t - t0) / (t1 - t0 || 1);
  const c0 = parseHex(stops[idx]);
  const c1 = parseHex(stops[idx + 1]);
  return {
    r: Math.round(lerp(c0.r, c1.r, local)),
    g: Math.round(lerp(c0.g, c1.g, local)),
    b: Math.round(lerp(c0.b, c1.b, local)),
  };
};

export const pngDataUri = (
  { type, angle, stops }: Gradient,
  width = 800,
  height = 400,
): string => {
  const png = new PNG({ width, height });
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const safeAngle = clampAngle(angle);
  const theta = (safeAngle * Math.PI) / 180; // CSS: 0=up
  const dirX = Math.sin(theta);
  const dirY = -Math.cos(theta);

  // Precompute projection range for linear
  const project = (x: number, y: number) => (x - cx) * dirX + (y - cy) * dirY;
  const corners = [
    project(0, 0),
    project(width - 1, 0),
    project(0, height - 1),
    project(width - 1, height - 1),
  ];
  const minProj = Math.min(...corners);
  const maxProj = Math.max(...corners);

  const maxRadius = Math.hypot(
    Math.max(cx, width - 1 - cx),
    Math.max(cy, height - 1 - cy),
  );

  let ptr = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let t = 0;
      if (type === 'linear') {
        const p = project(x, y);
        t = (p - minProj) / (maxProj - minProj || 1);
      } else if (type === 'radial') {
        const dx = x - cx;
        const dy = y - cy;
        t = Math.hypot(dx, dy) / (maxRadius || 1);
      } else {
        // conic
        const dx = x - cx;
        const dy = y - cy;
        let ang = Math.atan2(dy, dx); // -PI..PI, 0 at +X (right)
        // Map CSS 0deg (up) to fraction; rotate by -90deg
        ang = ang - Math.PI / 2;
        if (ang < 0) ang += 2 * Math.PI;
        t = ang / (2 * Math.PI);
      }
      t = clamp01(t);
      const c = interpolateStops(stops, t);
      png.data[ptr++] = c.r;
      png.data[ptr++] = c.g;
      png.data[ptr++] = c.b;
      png.data[ptr++] = 255;
    }
  }
  const buf = PNG.sync.write(png);
  const b64 = buf.toString('base64');
  return `data:image/png;base64,${b64}`;
};

export const solidColorPngDataUri = (hex: string, size = 16): string => {
  const png = new PNG({ width: size, height: size });
  const { r, g, b } = parseHex(hex);
  let ptr = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      png.data[ptr++] = r;
      png.data[ptr++] = g;
      png.data[ptr++] = b;
      png.data[ptr++] = 255;
    }
  }
  const buf = PNG.sync.write(png);
  return `data:image/png;base64,${buf.toString('base64')}`;
};
