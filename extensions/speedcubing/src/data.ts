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
};

type Step = {
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
];
