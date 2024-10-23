type Case = {
  name: string;
  id: string;
  algs: {
    moves: string;
    description?: string;
  }[];
};

const CASES: { [index: string]: Case } = {
  "dot-shape": {
    id: "dot-shape",
    name: "Dot Shape",
    algs: [
      {
        moves: "F ( R U R' U' ) F' f ( R U R' U' ) f'",
      },
    ],
  },
  "i-shape": {
    id: "i-shape",
    name: "I-Shape",
    algs: [
      {
        moves: "F ( R U R' U' ) F'",
      },
    ],
  },
  "l-shape": {
    id: "l-shape",
    name: "L-Shape",
    algs: [
      {
        moves: "f ( R U R' U' ) f'",
      },
      {
        moves: "Fw ( R U R’ U’ ) Fw’",
      },
      { moves: "F ( U R U’ R’ ) F’" },
      { moves: "F ( R U R’ U’ ) ( R U R’ U’ ) F’" },
    ],
  },
  sune: {
    id: "sune",
    name: "Sune",
    algs: [
      {
        moves: "R U R' U R U2 R'",
      },
    ],
  },
  "anti-sune": {
    id: "anti-sune",
    name: "Anti-Sune",
    algs: [
      {
        moves: "R U2 R' U' R U' R'",
      },
    ],
  },
  h: {
    id: "h",
    name: "H",
    algs: [
      {
        moves: "( R U R' U ) ( R U' R' U ) R U2 R'",
      },
    ],
  },
  l: {
    id: "l",
    name: "L",
    algs: [
      {
        moves: "F R' F' r U R U' r'",
      },
    ],
  },
  pi: {
    id: "pi",
    name: "Pi",
    algs: [
      {
        moves: "R U2 ( R2 U' R2 U' ) R2 U2 R",
      },
    ],
  },
  t: {
    id: "t",
    name: "T",
    algs: [
      {
        moves: "r ( U R' U' r' ) F R F'",
      },
    ],
  },
  u: {
    id: "u",
    name: "U",
    algs: [
      {
        moves: "R2 D R' U2 R D' R' U2 R'",
      },
    ],
  },
  "oll-1": {
    id: "oll-1",
    name: "OLL (1)",
    algs: [
      {
        moves: "R U2 R2 F R F' U2 R' F R F'",
      },
    ],
  },
  "oll-2": {
    id: "oll-2",
    name: "OLL (2)",
    algs: [
      {
        moves: "r U r' U2 r U2 R' U2 R U' r'",
      },
    ],
  },
  "oll-3": {
    id: "oll-3",
    name: "OLL (3)",
    algs: [
      {
        moves: "r' R2 U R' U r U2 r' U M'",
      },
    ],
  },
  "oll-4": {
    id: "oll-4",
    name: "OLL (4)",
    algs: [
      {
        moves: "M U' r U2 r' U' R U' R' M'",
      },
    ],
  },
  "oll-5": {
    id: "oll-5",
    name: "OLL (5)",
    algs: [
      {
        moves: "l' U2 L U L' U l",
      },
    ],
  },
  "oll-6": {
    id: "oll-6",
    name: "OLL (6)",
    algs: [
      {
        moves: "r U2 R' U' R U' r'",
      },
    ],
  },
  "oll-7": {
    id: "oll-7",
    name: "OLL (7)",
    algs: [
      {
        moves: "r U R' U R U2 r'",
      },
    ],
  },
  "oll-8": {
    id: "oll-8",
    name: "OLL (8)",
    algs: [
      {
        moves: "l' U' L U' L' U2 l",
      },
    ],
  },
  "oll-9": {
    id: "oll-9",
    name: "OLL (9)",
    algs: [
      {
        moves: "R U R' U' R' F R2 U R' U' F'",
      },
    ],
  },
  "oll-10": {
    id: "oll-10",
    name: "OLL (10)",
    algs: [
      {
        moves: "R U R' U R' F R F' R U2 R'",
      },
    ],
  },
  "oll-11": {
    id: "oll-11",
    name: "OLL (11)",
    algs: [
      {
        moves: "r U R' U R' F R F' R U2 r'",
      },
    ],
  },
  "oll-12": {
    id: "oll-12",
    name: "OLL (12)",
    algs: [
      {
        moves: "M' R' U' R U' R' U2 R U' R r'",
      },
    ],
  },
  "oll-13": {
    id: "oll-13",
    name: "OLL (13)",
    algs: [
      {
        moves: "F U R U' R2 F' R U R U' R'",
      },
    ],
  },
  "oll-14": {
    id: "oll-14",
    name: "OLL (14)",
    algs: [
      {
        moves: "R' F R U R' F' R F U' F'",
      },
    ],
  },
  "oll-15": {
    id: "oll-15",
    name: "OLL (15)",
    algs: [
      {
        moves: "l' U' l L' U' L U l' U l",
      },
    ],
  },
  "oll-16": {
    id: "oll-16",
    name: "OLL (16)",
    algs: [
      {
        moves: "r U r' R U R' U' r U' r'",
      },
    ],
  },
  "oll-17": {
    id: "oll-17",
    name: "OLL (17)",
    algs: [
      {
        moves: "F R' F' R2 r' U R U' R' U' M'",
      },
    ],
  },
  "oll-18": {
    id: "oll-18",
    name: "OLL (18)",
    algs: [
      {
        moves: "r U R' U R U2 r2 U' R U' R' U2 r",
      },
    ],
  },
  "oll-19": {
    id: "oll-19",
    name: "OLL (19)",
    algs: [
      {
        moves: "r' R U R U R' U' M' R' F R F'",
      },
    ],
  },
  "oll-20": {
    id: "oll-20",
    name: "OLL (20)",
    algs: [
      {
        moves: "r U R' U' M2 U R U' R' U' M'",
      },
    ],
  },
  "oll-28": {
    id: "oll-28",
    name: "OLL (28)",
    algs: [
      {
        moves: "r U R' U' r' R U R U' R'",
      },
    ],
  },
  "oll-29": {
    id: "oll-29",
    name: "OLL (29)",
    algs: [
      {
        moves: "R U R' U' R U' R' F' U' F R U R'",
      },
    ],
  },
  "oll-30": {
    id: "oll-30",
    name: "OLL (30)",
    algs: [
      {
        moves: "F R' F R2 U' R' U' R U R' F2",
      },
    ],
  },
  "oll-31": {
    id: "oll-31",
    name: "OLL (31)",
    algs: [
      {
        moves: "R' U' F U R U' R' F' R",
      },
    ],
  },
  "oll-32": {
    id: "oll-32",
    name: "OLL (32)",
    algs: [
      {
        moves: "L U F' U' L' U L F L'",
      },
    ],
  },
  "oll-33": {
    id: "oll-33",
    name: "OLL (33)",
    algs: [
      {
        moves: "R U R' U' R' F R F'",
      },
    ],
  },
  "oll-34": {
    id: "oll-34",
    name: "OLL (34)",
    algs: [
      {
        moves: "R U R2 U' R' F R U R U' F'",
      },
    ],
  },
  "oll-35": {
    id: "oll-35",
    name: "OLL (35)",
    algs: [
      {
        moves: "R U2 R2 F R F' R U2 R'",
      },
    ],
  },
  "oll-36": {
    id: "oll-36",
    name: "OLL (36)",
    algs: [
      {
        moves: "L' U' L U' L' U L U L F' L' F",
      },
    ],
  },
  "oll-37": {
    id: "oll-37",
    name: "OLL (37)",
    algs: [
      {
        moves: "F R' F' R U R U' R'",
      },
    ],
  },
  "oll-38": {
    id: "oll-38",
    name: "OLL (38)",
    algs: [
      {
        moves: "R U R' U R U' R' U' R' F R F'",
      },
    ],
  },
  "oll-39": {
    id: "oll-39",
    name: "OLL (39)",
    algs: [
      {
        moves: "L F' L' U' L U F U' L'",
      },
    ],
  },
  "oll-40": {
    id: "oll-40",
    name: "OLL (40)",
    algs: [
      {
        moves: "R' F R U R' U' F' U R",
      },
    ],
  },
  "oll-41": {
    id: "oll-41",
    name: "OLL (41)",
    algs: [
      {
        moves: "R U R' U R U2 R' F R U R' U' F'",
      },
    ],
  },
  "oll-42": {
    id: "oll-42",
    name: "OLL (42)",
    algs: [
      {
        moves: "R' U' R U' R' U2 R F R U R' U' F'",
      },
    ],
  },
  "oll-43": {
    id: "oll-43",
    name: "OLL (43)",
    algs: [
      {
        moves: "F' U' L' U L F",
      },
    ],
  },
  "oll-44": {
    id: "oll-44",
    name: "OLL (44)",
    algs: [
      {
        moves: "F U R U' R' F'",
      },
    ],
  },
  "oll-45": {
    id: "oll-45",
    name: "OLL (45)",
    algs: [
      {
        moves: "F R U R' U' F'",
      },
    ],
  },
  "oll-46": {
    id: "oll-46",
    name: "OLL (46)",
    algs: [
      {
        moves: "R' U' R' F R F' U R",
      },
    ],
  },
  "oll-47": {
    id: "oll-47",
    name: "OLL (47)",
    algs: [
      {
        moves: "R' U' R' F R F' R' F R F' U R",
      },
    ],
  },
  "oll-48": {
    id: "oll-48",
    name: "OLL (48)",
    algs: [
      {
        moves: "F R U R' U' R U R' U' F'",
      },
    ],
  },
  "oll-49": {
    id: "oll-49",
    name: "OLL (49)",
    algs: [
      {
        moves: "r U' r2 U r2 U r2 U' r",
      },
    ],
  },
  "oll-50": {
    id: "oll-50",
    name: "OLL (50)",
    algs: [
      {
        moves: "r' U r2 U' r2 U' r2 U r'",
      },
    ],
  },
  "oll-51": {
    id: "oll-51",
    name: "OLL (51)",
    algs: [
      {
        moves: "F U R U' R' U R U' R' F'",
      },
    ],
  },
  "oll-52": {
    id: "oll-52",
    name: "OLL (52)",
    algs: [
      {
        moves: "R U R' U R U' B U' B' R'",
      },
    ],
  },
  "oll-53": {
    id: "oll-53",
    name: "OLL (53)",
    algs: [
      {
        moves: "l' U2 L U L' U' L U L' U l",
      },
    ],
  },
  "oll-54": {
    id: "oll-54",
    name: "OLL (54)",
    algs: [
      {
        moves: "r U2 R' U' R U R' U' R U' r'",
      },
    ],
  },
  "oll-55": {
    id: "oll-55",
    name: "OLL (55)",
    algs: [
      {
        moves: "R' F R U R U' R2 F' R2 U' R' U R U R'",
      },
    ],
  },
  "oll-56": {
    id: "oll-56",
    name: "OLL (56)",
    algs: [
      {
        moves: "r' U' r U' R' U R U' R' U R r' U r",
      },
    ],
  },
  "oll-57": {
    id: "oll-57",
    name: "OLL (57)",
    algs: [
      {
        moves: "R U R' U' M' U R U' r'",
      },
    ],
  },
  diagonal: {
    id: "diagonal",
    name: "Diagonal",
    algs: [
      {
        moves: "F ( R U' R' U' ) R U R' F' R ( U R' U' R' ) F R F'",
      },
    ],
  },
  headlights: {
    id: "headlights",
    name: "Headlights",
    algs: [
      {
        moves: "( R U R' U' R' ) F R2 U' ( R' U' R U R' ) F'",
      },
    ],
  },
  "pll-h": {
    id: "pll-h",
    name: "PLL (H)",
    algs: [
      {
        moves: "M2 U M2 U2 M2 U M2",
      },
    ],
  },
  "pll-ua": {
    id: "pll-ua",
    name: "PLL (Ua)",
    algs: [
      {
        moves: "R U' ( R U R U ) ( R U' R' U' ) R2",
      },
    ],
  },
  "pll-ub": {
    id: "pll-ub",
    name: "PLL (Ub)",
    algs: [
      {
        moves: "R2 U R U R' ( U' R' U' R' ) U R'",
      },
    ],
  },
  "pll-z": {
    id: "pll-z",
    name: "PLL (Z)",
    algs: [
      {
        moves: "M' U M2 U M2 U M' U2 M2",
      },
    ],
  },
  "pll-e": {
    id: "pll-e",
    name: "PLL (E)",
    algs: [
      {
        moves: "x' L' U L D' L' U' L D L' U' L D' L' U L D",
      },
    ],
  },
  "pll-na": {
    id: "pll-na",
    name: "PLL (Na)",
    algs: [
      {
        moves: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'",
      },
    ],
  },
  "pll-nb": {
    id: "pll-nb",
    name: "PLL (Nb)",
    algs: [
      {
        moves: "R' U R U' R' F' U' F R U R' F R' F' R U' R",
      },
    ],
  },
  "pll-v": {
    id: "pll-v",
    name: "PLL (V)",
    algs: [
      {
        moves: "R' U R' U' y R' F' R2 U' R' U R' F R F",
      },
    ],
  },
  "pll-y": {
    id: "pll-y",
    name: "PLL (Y)",
    algs: [
      {
        moves: "F ( R U' R' U' ) R U R' F' ( R U R' U' ) R' F R F'",
      },
    ],
  },
  "pll-aa": {
    id: "pll-aa",
    name: "PLL (Aa)",
    algs: [
      {
        moves: "x L2 D2 L' U' L D2 L' U L'",
      },
      {
        moves: "y Lw' U R' D2 R U' R' D2 R2",
      },
    ],
  },
  "pll-ab": {
    id: "pll-ab",
    name: "PLL (Ab)",
    algs: [
      {
        moves: "x' L2 D2 L U L' D2 L U' L",
      },
    ],
  },
  "pll-f": {
    id: "pll-f",
    name: "PLL (F)",
    algs: [
      {
        moves: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R",
      },
    ],
  },
  "pll-ga": {
    id: "pll-ga",
    name: "PLL (Ga)",
    algs: [
      {
        moves: "R2 U R' U R' U' R U' R2 U' D R' U R D'",
      },
    ],
  },
  "pll-gb": {
    id: "pll-gb",
    name: "PLL (Gb)",
    algs: [
      {
        moves: "R' U' R U D' R2 U R' U R U' R U' R2 D",
      },
    ],
  },
  "pll-gc": {
    id: "pll-gc",
    name: "PLL (Gc)",
    algs: [
      {
        moves: "R2 U' R U' R U R' U R2 U D' R U' R' D",
      },
    ],
  },
  "pll-gd": {
    id: "pll-gd",
    name: "PLL (Gd)",
    algs: [
      {
        moves: "R U R' U' D R2 U' R U' R' U R' U R2 D'",
      },
    ],
  },
  "pll-ja": {
    id: "pll-ja",
    name: "PLL (Ja)",
    algs: [
      {
        moves: "x R2 F R F' R U2 r' U r U2",
      },
    ],
  },
  "pll-jb": {
    id: "pll-jb",
    name: "PLL (Jb)",
    algs: [
      {
        moves: "R U R' F' R U R' U' R' F R2 U' R'",
      },
    ],
  },
  "pll-ra": {
    id: "pll-ra",
    name: "PLL (Ra)",
    algs: [
      {
        moves: "R U' R' U' R U R D R' U' R D' R' U2 R'",
      },
    ],
  },
  "pll-rb": {
    id: "pll-rb",
    name: "PLL (Rb)",
    algs: [
      {
        moves: "R2 F R U R U' R' F' R U2 R' U2 R",
      },
    ],
  },
  "pll-t": {
    id: "pll-t",
    name: "PLL (T)",
    algs: [
      {
        moves: "R U R' U' R' F R2 U' R' U' R U R' F'",
      },
    ],
  },
};

export type Step = {
  title: string;
  cases: Case[];
};

export const fourLookLastLayer: Step[] = [
  {
    title: "Orient Last Layer Edges",
    cases: [CASES["dot-shape"], CASES["i-shape"], CASES["l-shape"]],
  },
  {
    title: "Orient Last Layer Corners",
    cases: [CASES["anti-sune"], CASES["h"], CASES["l"], CASES["pi"], CASES["sune"], CASES["t"], CASES["u"]],
  },
  {
    title: "Permute Last Layer Corners",
    cases: [CASES["diagonal"], CASES["headlights"]],
  },
  {
    title: "Permute Last Layer Edges",
    cases: [CASES["pll-h"], CASES["pll-ua"], CASES["pll-ub"], CASES["pll-z"]],
  },
];

export const permutationOfTheLastLayer: Step[] = [
  {
    title: "Adjacent Corner Swap",
    cases: [
      CASES["pll-aa"],
      CASES["pll-ab"],
      CASES["pll-f"],
      CASES["pll-ga"],
      CASES["pll-gb"],
      CASES["pll-gc"],
      CASES["pll-gd"],
      CASES["pll-ja"],
      CASES["pll-jb"],
      CASES["pll-ra"],
      CASES["pll-rb"],
      CASES["pll-t"],
    ],
  },
  {
    title: "Diagonal Corner Swap",
    cases: [CASES["pll-e"], CASES["pll-na"], CASES["pll-nb"], CASES["pll-v"], CASES["pll-y"]],
  },
  {
    title: "Edges Only",
    cases: [CASES["pll-h"], CASES["pll-ua"], CASES["pll-ub"], CASES["pll-z"]],
  },
];

export const orientationOfTheLastLayer: Step[] = [
  {
    title: "Awkward Shape",
    cases: [CASES["oll-29"], CASES["oll-30"], CASES["oll-41"], CASES["oll-42"]],
  },
  {
    title: "Big Lightning Bolt",
    cases: [CASES["oll-39"], CASES["oll-40"]],
  },
  {
    title: "C Shape",
    cases: [CASES["oll-34"], CASES["oll-46"]],
  },
  {
    title: "Corners Oriented",
    cases: [CASES["oll-28"], CASES["oll-57"]],
  },
  {
    title: "Cross",
    cases: [CASES["sune"], CASES["anti-sune"], CASES["h"], CASES["l"], CASES["pi"], CASES["u"], CASES["t"]],
  },
  {
    title: "Dot",
    cases: [
      CASES["oll-1"],
      CASES["oll-2"],
      CASES["oll-3"],
      CASES["oll-4"],
      CASES["oll-17"],
      CASES["oll-18"],
      CASES["oll-19"],
      CASES["oll-20"],
    ],
  },
  { title: "Fish Shape", cases: [CASES["oll-9"], CASES["oll-10"], CASES["oll-35"], CASES["oll-37"]] },
  { title: "I Shape", cases: [CASES["oll-51"], CASES["oll-52"], CASES["oll-55"], CASES["oll-56"]] },
  { title: "Knight Move Shape", cases: [CASES["oll-13"], CASES["oll-14"], CASES["oll-15"], CASES["oll-16"]] },
  { title: "P Shape", cases: [CASES["oll-31"], CASES["oll-32"], CASES["oll-43"], CASES["oll-44"]] },
  {
    title: "Small L Shape",
    cases: [CASES["oll-47"], CASES["oll-48"], CASES["oll-49"], CASES["oll-50"], CASES["oll-53"], CASES["oll-54"]],
  },
  { title: "Small Lightning Bolt", cases: [CASES["oll-7"], CASES["oll-8"], CASES["oll-11"], CASES["oll-12"]] },
  { title: "Square Shape", cases: [CASES["oll-5"], CASES["oll-6"]] },
  { title: "T Shape", cases: [CASES["oll-33"], CASES["oll-45"]] },
  { title: "W Shape", cases: [CASES["oll-36"], CASES["oll-38"]] },
];

export const notation = [
  {
    title: "Clockwise",
    notations: ["F", "R", "U", "L", "B", "D"],
  },
  {
    title: "Counter-Clockwise",
    notations: ["F'", "R'", "U'", "L'", "B'", "D'"],
  },
  {
    title: "Double Turn",
    notations: ["F2", "R2", "U2", "L2", "B2", "D2"],
  },
  {
    title: "Wide Moves",
    notations: ["Fw-f", "Rw-r", "Uw-u", "Lw-l", "Bw-b", "Dw-d"],
  },
  {
    title: "Slice Moves",
    notations: ["M", "E", "S", "M'", "E'", "S'"],
  },
  {
    title: "Cube Rotations",
    notations: ["x", "y", "z", "x'", "y'", "z'"],
  },
];
