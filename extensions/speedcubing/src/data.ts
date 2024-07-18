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
