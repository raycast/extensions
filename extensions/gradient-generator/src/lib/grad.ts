import {
  Gradient,
  ValidationError,
  ValidationResult,
  GradientValidation,
} from '../types';
import { PNG } from 'pngjs';

// Validation functions
export const isValidHex = (color: string): boolean => {
  if (!color || typeof color !== 'string') return false;
  const trimmed = color.trim();
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(trimmed);
};

export const validateStops = (stops: string[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!Array.isArray(stops)) {
    errors.push({
      field: 'stops',
      message: 'Stops must be an array',
      severity: 'error',
    });
    return errors;
  }

  if (stops.length < 2) {
    errors.push({
      field: 'stops',
      message: 'At least 2 color stops are required',
      severity: 'error',
    });
  }

  if (stops.length > 10) {
    errors.push({
      field: 'stops',
      message: 'Maximum 10 color stops allowed',
      severity: 'warning',
    });
  }

  stops.forEach((stop, index) => {
    if (!isValidHex(stop)) {
      errors.push({
        field: `stop-${index}`,
        message: `Invalid hex color: ${stop}`,
        severity: 'error',
      });
    }
  });

  return errors;
};

export const validateAngle = (angle?: number): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (angle === undefined || angle === null) {
    return errors; // Angle is optional
  }

  if (typeof angle !== 'number' || Number.isNaN(angle)) {
    errors.push({
      field: 'angle',
      message: 'Angle must be a valid number',
      severity: 'error',
    });
    return errors;
  }

  if (angle < 0) {
    errors.push({
      field: 'angle',
      message: 'Angle cannot be negative',
      severity: 'error',
    });
  }

  if (angle > 360) {
    errors.push({
      field: 'angle',
      message: 'Angle cannot exceed 360 degrees',
      severity: 'error',
    });
  }

  return errors;
};

export const validateGradient = (gradient: Gradient): GradientValidation => {
  const stopErrors = validateStops(gradient.stops);
  const angleErrors = validateAngle(gradient.angle);

  const allErrors = [...stopErrors, ...angleErrors].filter(
    (e) => e.severity === 'error',
  );
  const allWarnings = [...stopErrors, ...angleErrors].filter(
    (e) => e.severity === 'warning',
  );

  const overall: ValidationResult = {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };

  return {
    stops: stopErrors,
    angle: angleErrors,
    overall,
  };
};

const clampAngle = (angle?: number): number => {
  if (typeof angle !== 'number' || Number.isNaN(angle)) return 90;
  if (angle < 0) return 0;
  if (angle > 360) return 360;
  return angle;
};

// Safe color parsing with fallback
const safeParseHex = (hex: string): string => {
  if (!isValidHex(hex)) {
    return '#000000'; // Fallback to black for invalid colors
  }
  return hex.trim().toUpperCase();
};

export const toCss = ({ type, angle, stops }: Gradient): string => {
  // Validate before processing
  const validation = validateGradient({ type, angle, stops });
  if (!validation.overall.isValid) {
    return 'background: #000000; /* Invalid gradient */';
  }

  const safeAngle = clampAngle(angle);
  const safeStops = stops.map(safeParseHex);

  const gradientBody =
    type === 'linear'
      ? `linear-gradient(${safeAngle}deg, ${safeStops.join(', ')})`
      : type === 'radial'
        ? `radial-gradient(${safeStops.join(', ')})`
        : `conic-gradient(${safeStops.join(', ')})`;
  return `background: ${gradientBody};`;
};

export const toSwiftUI = ({ type, angle, stops }: Gradient): string => {
  // Validate before processing
  const validation = validateGradient({ type, angle, stops });
  if (!validation.overall.isValid) {
    return 'Color.black /* Invalid gradient */';
  }

  const safeStops = stops
    .map(safeParseHex)
    .map((c) => `Color(hex: "${c}")`)
    .join(', ');

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
    return `LinearGradient(gradient: Gradient(colors: [${safeStops}]), startPoint: ${start}, endPoint: ${end})`;
  }
  if (type === 'radial') {
    return `RadialGradient(gradient: Gradient(colors: [${safeStops}]), center: .center, startRadius: 0, endRadius: 200)`;
  }
  return `AngularGradient(gradient: Gradient(colors: [${safeStops}]), center: .center)`;
};

export const toTailwind = ({ type, angle, stops }: Gradient): string => {
  // Validate before processing
  const validation = validateGradient({ type, angle, stops });
  if (!validation.overall.isValid) {
    return 'bg-black /* Invalid gradient */';
  }

  const safeAngle = clampAngle(angle);
  const safeStops = stops.map(safeParseHex);

  if (type === 'linear') {
    return `bg-[linear-gradient(${safeAngle}deg,_${safeStops.join(',_')})]`;
  }
  if (type === 'radial') {
    return `bg-[radial-gradient(${safeStops.join(',_')})]`;
  }
  return `bg-[conic-gradient(${safeStops.join(',_')})]`;
};

export const svgDataUri = ({ type, angle, stops }: Gradient): string => {
  // Validate before processing
  const validation = validateGradient({ type, angle, stops });
  if (!validation.overall.isValid) {
    // Return a simple black SVG for invalid gradients
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDgwMCA0MDAiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMwMDAiIC8+PC9zdmc+';
  }

  const safeAngle = clampAngle(angle);
  const safeStops = stops.map(safeParseHex);

  const buildStops = () => {
    const total = Math.max(2, safeStops.length);
    return safeStops
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
      <div xmlns='http://www.w3.org/1999/xhtml' style='width:100%;height:100%;background: conic-gradient(${safeStops.join(
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
    // Return fallback SVG on encoding error
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDgwMCA0MDAiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMwMDAiIC8+PC9zdmc+';
  }
  return `data:image/svg+xml;base64,${base64}`;
};

export const svgMarkup = ({ type, angle, stops }: Gradient): string => {
  // Validate before processing
  const validation = validateGradient({ type, angle, stops });
  if (!validation.overall.isValid) {
    return '<svg width="800" height="400" viewBox="0 0 800 400"><rect width="100%" height="100%" fill="#000" /></svg>';
  }

  const safeAngle = clampAngle(angle);
  const safeStops = stops.map(safeParseHex);

  const buildStops = () => {
    const total = Math.max(2, safeStops.length);
    return safeStops
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
      <div xmlns='http://www.w3.org/1999/xhtml' style='width:100%;height:100%;background: conic-gradient(${safeStops.join(
        ', ',
      )});'></div>
    </foreignObject>`;
    defs = fallbackDefs;
    body = `<rect width='100%' height='100%' fill='url(#fallback)' />${html}`;
  }

  return `${svgHead}${defs}${body}</svg>`;
};

export const toSvg = (
  { type, angle, stops }: Gradient,
  width = 800,
  height = 400,
  preserveAspectRatio = 'xMidYMid slice',
): string => {
  // Validate before processing
  const validation = validateGradient({ type, angle, stops });
  if (!validation.overall.isValid) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#000" /></svg>`;
  }

  const safeAngle = clampAngle(angle);
  const safeStops = stops.map(safeParseHex);

  const buildStops = () => {
    const total = Math.max(2, safeStops.length);
    return safeStops
      .map((color, index) => {
        const offset = (index / (total - 1)) * 100;
        return `<stop offset='${offset.toFixed(2)}%' stop-color='${color}' />`;
      })
      .join('');
  };

  const svgHead = `<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}' preserveAspectRatio='${preserveAspectRatio}'>`;
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
    // Conic: use foreignObject with HTML/CSS conic-gradient for better browser support
    const fallbackDefs = `<defs>
      <radialGradient id='fallback' cx='50%' cy='50%' r='75%'>
        ${buildStops()}
      </radialGradient>
    </defs>`;
    const html = `<foreignObject width='100%' height='100%'>
      <div xmlns='http://www.w3.org/1999/xhtml' style='width:100%;height:100%;background: conic-gradient(${safeStops.join(
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
  if (!isValidHex(hex)) {
    return { r: 0, g: 0, b: 0 }; // Default to black for invalid hex
  }

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
  if (!Array.isArray(stops) || stops.length < 2) {
    return { r: 0, g: 0, b: 0 }; // Fallback for invalid stops
  }

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
  // Validate before processing
  const validation = validateGradient({ type, angle, stops });
  if (!validation.overall.isValid) {
    // Return a simple black PNG for invalid gradients
    try {
      const png = new PNG({ width, height });
      let ptr = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          png.data[ptr++] = 0; // r
          png.data[ptr++] = 0; // g
          png.data[ptr++] = 0; // b
          png.data[ptr++] = 255; // a
        }
      }
      const buf = PNG.sync.write(png);
      const b64 = buf.toString('base64');
      return `data:image/png;base64,${b64}`;
    } catch {
      // Ultimate fallback - return a minimal black PNG
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    }
  }

  try {
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
  } catch (error) {
    // Return fallback PNG on any error
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
};

export const solidColorPngDataUri = (hex: string, size = 16): string => {
  if (!isValidHex(hex)) {
    hex = '#000000'; // Fallback to black for invalid hex
  }

  try {
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
  } catch (error) {
    // Return fallback PNG on any error
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
};

// Enhanced PNG generation with DPR and transparency support
export const generatePng = (
  { type, angle, stops }: Gradient,
  width: number,
  height: number,
  dpr: number = 2,
  transparentBackground: boolean = false,
): Buffer => {
  // Validate before processing
  const validation = validateGradient({ type, angle, stops });
  if (!validation.overall.isValid) {
    // Return a simple black PNG for invalid gradients
    try {
      const png = new PNG({ width: width * dpr, height: height * dpr });
      let ptr = 0;
      for (let y = 0; y < height * dpr; y++) {
        for (let x = 0; x < width * dpr; x++) {
          png.data[ptr++] = 0; // r
          png.data[ptr++] = 0; // g
          png.data[ptr++] = 0; // b
          png.data[ptr++] = transparentBackground ? 0 : 255; // a
        }
      }
      return PNG.sync.write(png);
    } catch {
      // Ultimate fallback - return a minimal black PNG
      return Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64',
      );
    }
  }

  try {
    const png = new PNG({ width: width * dpr, height: height * dpr });
    const cx = (width * dpr - 1) / 2;
    const cy = (height * dpr - 1) / 2;
    const safeAngle = clampAngle(angle);
    const theta = (safeAngle * Math.PI) / 180; // CSS: 0=up
    const dirX = Math.sin(theta);
    const dirY = -Math.cos(theta);

    // Precompute projection range for linear
    const project = (x: number, y: number) => (x - cx) * dirX + (y - cy) * dirY;
    const corners = [
      project(0, 0),
      project(width * dpr - 1, 0),
      project(0, height * dpr - 1),
      project(width * dpr - 1, height * dpr - 1),
    ];
    const minProj = Math.min(...corners);
    const maxProj = Math.max(...corners);

    const maxRadius = Math.hypot(
      Math.max(cx, width * dpr - 1 - cx),
      Math.max(cy, height * dpr - 1 - cy),
    );

    let ptr = 0;
    for (let y = 0; y < height * dpr; y++) {
      for (let x = 0; x < width * dpr; x++) {
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
        // For transparent background, make pixels with no gradient contribution transparent
        if (transparentBackground && (t <= 0 || t >= 1)) {
          png.data[ptr++] = 0; // transparent
        } else {
          png.data[ptr++] = 255; // opaque
        }
      }
    }
    return PNG.sync.write(png);
  } catch (error) {
    // Return fallback PNG on any error
    return Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    );
  }
};

// Size presets for common use cases
export const PNG_SIZE_PRESETS = [
  { name: 'HD (1600×1000)', width: 1600, height: 1000 },
  { name: 'Full HD (1920×1080)', width: 1920, height: 1080 },
  { name: '2K (2560×1440)', width: 2560, height: 1440 },
  { name: '4K (3840×2160)', width: 3840, height: 2160 },
] as const;
