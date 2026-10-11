import { Fastener, Thread } from "./types";

// Tap drills: ISO 261 / DIN 13 coarse and fine pitch (tap drill = major - pitch)
// Clearance: ISO 273 (fine H12 / medium H13 / coarse H14)
// Counterbore: socket head cap screw, ISO 4762 / DIN 974 (depth = head height)

type ThreadSpec = [pitch: number, series: "coarse" | "fine", drill: number];
type CboreSpec = [dia: number, depth: number, headDia: number];

interface Spec {
  size: number;
  threads: ThreadSpec[];
  close: number;
  normal: number;
  loose: number;
  cbore?: CboreSpec;
}

const SPECS: Spec[] = [
  { size: 1.6, threads: [[0.35, "coarse", 1.25]], close: 1.7, normal: 1.8, loose: 2.0 },
  { size: 2, threads: [[0.4, "coarse", 1.6]], close: 2.2, normal: 2.4, loose: 2.6, cbore: [4.4, 2, 3.8] },
  { size: 2.5, threads: [[0.45, "coarse", 2.05]], close: 2.7, normal: 2.9, loose: 3.1, cbore: [5.4, 2.5, 4.5] },
  { size: 3, threads: [[0.5, "coarse", 2.5]], close: 3.2, normal: 3.4, loose: 3.6, cbore: [6.5, 3, 5.5] },
  { size: 3.5, threads: [[0.6, "coarse", 2.9]], close: 3.7, normal: 3.9, loose: 4.2 },
  { size: 4, threads: [[0.7, "coarse", 3.3]], close: 4.3, normal: 4.5, loose: 4.8, cbore: [8, 4, 7] },
  { size: 5, threads: [[0.8, "coarse", 4.2]], close: 5.3, normal: 5.5, loose: 5.8, cbore: [10, 5, 8.5] },
  { size: 6, threads: [[1.0, "coarse", 5.0]], close: 6.4, normal: 6.6, loose: 7.0, cbore: [11, 6, 10] },
  { size: 7, threads: [[1.0, "coarse", 6.0]], close: 7.4, normal: 7.6, loose: 8.0 },
  {
    size: 8,
    threads: [
      [1.25, "coarse", 6.8],
      [1.0, "fine", 7.0],
    ],
    close: 8.4,
    normal: 9.0,
    loose: 10.0,
    cbore: [15, 8, 13],
  },
  {
    size: 10,
    threads: [
      [1.5, "coarse", 8.5],
      [1.25, "fine", 8.8],
      [1.0, "fine", 9.0],
    ],
    close: 10.5,
    normal: 11.0,
    loose: 12.0,
    cbore: [18, 10, 16],
  },
  {
    size: 12,
    threads: [
      [1.75, "coarse", 10.2],
      [1.5, "fine", 10.5],
      [1.25, "fine", 10.8],
    ],
    close: 13.0,
    normal: 13.5,
    loose: 14.5,
    cbore: [20, 12, 18],
  },
  {
    size: 14,
    threads: [
      [2.0, "coarse", 12.0],
      [1.5, "fine", 12.5],
    ],
    close: 15.0,
    normal: 15.5,
    loose: 16.5,
    cbore: [24, 14, 21],
  },
  {
    size: 16,
    threads: [
      [2.0, "coarse", 14.0],
      [1.5, "fine", 14.5],
    ],
    close: 17.0,
    normal: 17.5,
    loose: 18.5,
    cbore: [26, 16, 24],
  },
  {
    size: 18,
    threads: [
      [2.5, "coarse", 15.5],
      [1.5, "fine", 16.5],
    ],
    close: 19.0,
    normal: 20.0,
    loose: 21.0,
  },
  {
    size: 20,
    threads: [
      [2.5, "coarse", 17.5],
      [1.5, "fine", 18.5],
    ],
    close: 21.0,
    normal: 22.0,
    loose: 24.0,
    cbore: [33, 20, 30],
  },
  {
    size: 22,
    threads: [
      [2.5, "coarse", 19.5],
      [1.5, "fine", 20.5],
    ],
    close: 23.0,
    normal: 24.0,
    loose: 26.0,
  },
  {
    size: 24,
    threads: [
      [3.0, "coarse", 21.0],
      [2.0, "fine", 22.0],
    ],
    close: 25.0,
    normal: 26.0,
    loose: 28.0,
    cbore: [40, 24, 36],
  },
  {
    size: 27,
    threads: [
      [3.0, "coarse", 24.0],
      [2.0, "fine", 25.0],
    ],
    close: 28.0,
    normal: 30.0,
    loose: 32.0,
  },
  {
    size: 30,
    threads: [
      [3.5, "coarse", 26.5],
      [2.0, "fine", 28.0],
    ],
    close: 31.0,
    normal: 33.0,
    loose: 35.0,
    cbore: [48, 30, 45],
  },
];

function toThread(size: number, [pitch, series, drill]: ThreadSpec): Thread {
  return {
    designation: `M${size}x${Number.isInteger(pitch) ? pitch.toFixed(1) : String(pitch)}`,
    series,
    pitch,
    tapDrill: drill,
  };
}

export const METRIC: Fastener[] = SPECS.map((s) => ({
  system: "metric",
  unit: "mm",
  size: `M${s.size}`,
  sizeNumber: s.size,
  majorDia: s.size,
  threads: s.threads.map((t) => toThread(s.size, t)),
  clearance: {
    close: { dia: s.close },
    normal: { dia: s.normal },
    loose: { dia: s.loose },
  },
  counterbore: s.cbore
    ? { dia: s.cbore[0], depth: s.cbore[1], headDia: s.cbore[2], headHeight: s.cbore[1] }
    : undefined,
}));
