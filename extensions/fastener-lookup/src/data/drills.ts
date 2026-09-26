export interface DrillSize {
  name: string;
  dia: number;
}

const NUMBER_DRILLS: [number, number][] = [
  [80, 0.0135],
  [79, 0.0145],
  [78, 0.016],
  [77, 0.018],
  [76, 0.02],
  [75, 0.021],
  [74, 0.0225],
  [73, 0.024],
  [72, 0.025],
  [71, 0.026],
  [70, 0.028],
  [69, 0.0292],
  [68, 0.031],
  [67, 0.032],
  [66, 0.033],
  [65, 0.035],
  [64, 0.036],
  [63, 0.037],
  [62, 0.038],
  [61, 0.039],
  [60, 0.04],
  [59, 0.041],
  [58, 0.042],
  [57, 0.043],
  [56, 0.0465],
  [55, 0.052],
  [54, 0.055],
  [53, 0.0595],
  [52, 0.0635],
  [51, 0.067],
  [50, 0.07],
  [49, 0.073],
  [48, 0.076],
  [47, 0.0785],
  [46, 0.081],
  [45, 0.082],
  [44, 0.086],
  [43, 0.089],
  [42, 0.0935],
  [41, 0.096],
  [40, 0.098],
  [39, 0.0995],
  [38, 0.1015],
  [37, 0.104],
  [36, 0.1065],
  [35, 0.11],
  [34, 0.111],
  [33, 0.113],
  [32, 0.116],
  [31, 0.12],
  [30, 0.1285],
  [29, 0.136],
  [28, 0.1405],
  [27, 0.144],
  [26, 0.147],
  [25, 0.1495],
  [24, 0.152],
  [23, 0.154],
  [22, 0.157],
  [21, 0.159],
  [20, 0.161],
  [19, 0.166],
  [18, 0.1695],
  [17, 0.173],
  [16, 0.177],
  [15, 0.18],
  [14, 0.182],
  [13, 0.185],
  [12, 0.189],
  [11, 0.191],
  [10, 0.1935],
  [9, 0.196],
  [8, 0.199],
  [7, 0.201],
  [6, 0.204],
  [5, 0.2055],
  [4, 0.209],
  [3, 0.213],
  [2, 0.221],
  [1, 0.228],
];

const LETTER_DRILLS: [string, number][] = [
  ["A", 0.234],
  ["B", 0.238],
  ["C", 0.242],
  ["D", 0.246],
  ["E", 0.25],
  ["F", 0.257],
  ["G", 0.261],
  ["H", 0.266],
  ["I", 0.272],
  ["J", 0.277],
  ["K", 0.281],
  ["L", 0.29],
  ["M", 0.295],
  ["N", 0.302],
  ["O", 0.316],
  ["P", 0.323],
  ["Q", 0.332],
  ["R", 0.339],
  ["S", 0.348],
  ["T", 0.358],
  ["U", 0.368],
  ["V", 0.377],
  ["W", 0.386],
  ["X", 0.397],
  ["Y", 0.404],
  ["Z", 0.413],
];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function fractionName(sixtyFourths: number): string {
  const whole = Math.floor(sixtyFourths / 64);
  const rem = sixtyFourths % 64;
  if (rem === 0) return `${whole}`;
  const g = gcd(rem, 64);
  const frac = `${rem / g}/${64 / g}`;
  return whole > 0 ? `${whole}-${frac}` : frac;
}

// Published drill charts round exact halves to even (9/32 = 0.28125 -> 0.2812)
function roundHalfEven(v: number, places: number): number {
  const scale = 10 ** places;
  const scaled = v * scale;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  if (Math.abs(diff - 0.5) < 1e-9) return (floor % 2 === 0 ? floor : floor + 1) / scale;
  return Math.round(scaled) / scale;
}

const FRACTIONAL_DRILLS: DrillSize[] = Array.from({ length: 96 }, (_, i) => i + 1).map((n) => ({
  name: fractionName(n),
  dia: roundHalfEven(n / 64, 4),
}));

export const DRILLS: DrillSize[] = [
  ...NUMBER_DRILLS.map(([n, dia]) => ({ name: `#${n}`, dia })),
  ...LETTER_DRILLS.map(([name, dia]) => ({ name, dia })),
  ...FRACTIONAL_DRILLS,
].sort((a, b) => a.dia - b.dia);

export function nearestDrill(inches: number): DrillSize {
  let best = DRILLS[0];
  for (const d of DRILLS) {
    if (Math.abs(d.dia - inches) < Math.abs(best.dia - inches)) best = d;
  }
  return best;
}
