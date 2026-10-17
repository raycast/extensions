import { Fastener, Thread } from "./types";

// Tap drills: ~75% thread, Machinery's Handbook / ASME B1.1
// Clearance: ASME B18.2.8 (close / normal / loose)
// Counterbore: socket head cap screw, ASME B18.3 (depth = head height)

type ThreadSpec = [tpi: number, series: "coarse" | "fine", drill: number, drillName: string];
type HoleSpec = [dia: number, name: string];
type CboreSpec = [dia: number, depth: number, headDia: number];

interface Spec {
  size: string;
  sizeNumber: number;
  major: number;
  threads: ThreadSpec[];
  close: HoleSpec;
  normal: HoleSpec;
  loose: HoleSpec;
  cbore?: CboreSpec;
}

const SPECS: Spec[] = [
  {
    size: "#0",
    sizeNumber: 0,
    major: 0.06,
    threads: [[80, "fine", 0.0469, "3/64"]],
    close: [0.0635, "#52"],
    normal: [0.07, "#50"],
    loose: [0.076, "#48"],
    cbore: [0.125, 0.06, 0.096],
  },
  {
    size: "#1",
    sizeNumber: 1,
    major: 0.073,
    threads: [
      [64, "coarse", 0.0595, "#53"],
      [72, "fine", 0.0595, "#53"],
    ],
    close: [0.076, "#48"],
    normal: [0.081, "#46"],
    loose: [0.086, "#44"],
    cbore: [0.1562, 0.073, 0.118],
  },
  {
    size: "#2",
    sizeNumber: 2,
    major: 0.086,
    threads: [
      [56, "coarse", 0.07, "#50"],
      [64, "fine", 0.07, "#50"],
    ],
    close: [0.089, "#43"],
    normal: [0.096, "#41"],
    loose: [0.104, "#37"],
    cbore: [0.1875, 0.086, 0.14],
  },
  {
    size: "#3",
    sizeNumber: 3,
    major: 0.099,
    threads: [
      [48, "coarse", 0.0785, "#47"],
      [56, "fine", 0.082, "#45"],
    ],
    close: [0.104, "#37"],
    normal: [0.11, "#35"],
    loose: [0.116, "#32"],
    cbore: [0.2188, 0.099, 0.161],
  },
  {
    size: "#4",
    sizeNumber: 4,
    major: 0.112,
    threads: [
      [40, "coarse", 0.089, "#43"],
      [48, "fine", 0.0935, "#42"],
    ],
    close: [0.116, "#32"],
    normal: [0.1285, "#30"],
    loose: [0.136, "#29"],
    cbore: [0.2188, 0.112, 0.183],
  },
  {
    size: "#5",
    sizeNumber: 5,
    major: 0.125,
    threads: [
      [40, "coarse", 0.1015, "#38"],
      [44, "fine", 0.104, "#37"],
    ],
    close: [0.1285, "#30"],
    normal: [0.136, "#29"],
    loose: [0.144, "#27"],
    cbore: [0.25, 0.125, 0.205],
  },
  {
    size: "#6",
    sizeNumber: 6,
    major: 0.138,
    threads: [
      [32, "coarse", 0.1065, "#36"],
      [40, "fine", 0.113, "#33"],
    ],
    close: [0.144, "#27"],
    normal: [0.1495, "#25"],
    loose: [0.157, "#22"],
    cbore: [0.2812, 0.138, 0.226],
  },
  {
    size: "#8",
    sizeNumber: 8,
    major: 0.164,
    threads: [
      [32, "coarse", 0.136, "#29"],
      [36, "fine", 0.136, "#29"],
    ],
    close: [0.1695, "#18"],
    normal: [0.177, "#16"],
    loose: [0.185, "#13"],
    cbore: [0.3125, 0.164, 0.27],
  },
  {
    size: "#10",
    sizeNumber: 10,
    major: 0.19,
    threads: [
      [24, "coarse", 0.1495, "#25"],
      [32, "fine", 0.159, "#21"],
    ],
    close: [0.196, "#9"],
    normal: [0.201, "#7"],
    loose: [0.213, "#3"],
    cbore: [0.375, 0.19, 0.312],
  },
  {
    size: "#12",
    sizeNumber: 12,
    major: 0.216,
    threads: [
      [24, "coarse", 0.177, "#16"],
      [28, "fine", 0.182, "#14"],
    ],
    close: [0.221, "#2"],
    normal: [0.228, "#1"],
    loose: [0.238, "B"],
  },
  {
    size: "1/4",
    sizeNumber: 0.25,
    major: 0.25,
    threads: [
      [20, "coarse", 0.201, "#7"],
      [28, "fine", 0.213, "#3"],
    ],
    close: [0.257, "F"],
    normal: [0.266, "H"],
    loose: [0.2812, "9/32"],
    cbore: [0.4375, 0.25, 0.375],
  },
  {
    size: "5/16",
    sizeNumber: 0.3125,
    major: 0.3125,
    threads: [
      [18, "coarse", 0.257, "F"],
      [24, "fine", 0.272, "I"],
    ],
    close: [0.323, "P"],
    normal: [0.332, "Q"],
    loose: [0.3438, "11/32"],
    cbore: [0.5312, 0.3125, 0.469],
  },
  {
    size: "3/8",
    sizeNumber: 0.375,
    major: 0.375,
    threads: [
      [16, "coarse", 0.3125, "5/16"],
      [24, "fine", 0.332, "Q"],
    ],
    close: [0.386, "W"],
    normal: [0.397, "X"],
    loose: [0.4062, "13/32"],
    cbore: [0.625, 0.375, 0.562],
  },
  {
    size: "7/16",
    sizeNumber: 0.4375,
    major: 0.4375,
    threads: [
      [14, "coarse", 0.368, "U"],
      [20, "fine", 0.3906, "25/64"],
    ],
    close: [0.4531, "29/64"],
    normal: [0.4688, "15/32"],
    loose: [0.4844, "31/64"],
    cbore: [0.7188, 0.4375, 0.656],
  },
  {
    size: "1/2",
    sizeNumber: 0.5,
    major: 0.5,
    threads: [
      [13, "coarse", 0.4219, "27/64"],
      [20, "fine", 0.4531, "29/64"],
    ],
    close: [0.5156, "33/64"],
    normal: [0.5312, "17/32"],
    loose: [0.5625, "9/16"],
    cbore: [0.8125, 0.5, 0.75],
  },
  {
    size: "9/16",
    sizeNumber: 0.5625,
    major: 0.5625,
    threads: [
      [12, "coarse", 0.4844, "31/64"],
      [18, "fine", 0.5156, "33/64"],
    ],
    close: [0.5781, "37/64"],
    normal: [0.5938, "19/32"],
    loose: [0.625, "5/8"],
    cbore: [0.9062, 0.5625, 0.844],
  },
  {
    size: "5/8",
    sizeNumber: 0.625,
    major: 0.625,
    threads: [
      [11, "coarse", 0.5312, "17/32"],
      [18, "fine", 0.5781, "37/64"],
    ],
    close: [0.6406, "41/64"],
    normal: [0.6562, "21/32"],
    loose: [0.6875, "11/16"],
    cbore: [1.0, 0.625, 0.938],
  },
  {
    size: "3/4",
    sizeNumber: 0.75,
    major: 0.75,
    threads: [
      [10, "coarse", 0.6562, "21/32"],
      [16, "fine", 0.6875, "11/16"],
    ],
    close: [0.7656, "49/64"],
    normal: [0.7812, "25/32"],
    loose: [0.8125, "13/16"],
    cbore: [1.1875, 0.75, 1.125],
  },
  {
    size: "7/8",
    sizeNumber: 0.875,
    major: 0.875,
    threads: [
      [9, "coarse", 0.7656, "49/64"],
      [14, "fine", 0.8125, "13/16"],
    ],
    close: [0.8906, "57/64"],
    normal: [0.9062, "29/32"],
    loose: [0.9375, "15/16"],
    cbore: [1.375, 0.875, 1.312],
  },
  {
    size: "1",
    sizeNumber: 1,
    major: 1.0,
    threads: [
      [8, "coarse", 0.875, "7/8"],
      [12, "fine", 0.9219, "59/64"],
    ],
    close: [1.0156, "1-1/64"],
    normal: [1.0312, "1-1/32"],
    loose: [1.0938, "1-3/32"],
    cbore: [1.625, 1.0, 1.5],
  },
];

function toThread(size: string, [tpi, series, drill, drillName]: ThreadSpec): Thread {
  return {
    designation: `${size}-${tpi} ${series === "coarse" ? "UNC" : "UNF"}`,
    series,
    tpi,
    tapDrill: drill,
    tapDrillName: drillName,
  };
}

export const IMPERIAL: Fastener[] = SPECS.map((s) => ({
  system: "imperial",
  unit: "in",
  size: s.size,
  sizeNumber: s.sizeNumber,
  majorDia: s.major,
  threads: s.threads.map((t) => toThread(s.size, t)),
  clearance: {
    close: { dia: s.close[0], name: s.close[1] },
    normal: { dia: s.normal[0], name: s.normal[1] },
    loose: { dia: s.loose[0], name: s.loose[1] },
  },
  counterbore: s.cbore
    ? { dia: s.cbore[0], depth: s.cbore[1], headDia: s.cbore[2], headHeight: s.cbore[1] }
    : undefined,
}));
