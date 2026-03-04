import type { StandardProfileDefinition } from "../types";

export const TEE_PROFILES: StandardProfileDefinition[] = [
  {
    id: "tee_en",
    label: "Tee Section (T)",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10055",
    sizes: [
      {
        id: "t30x4",
        label: "T 30×30×4",
        areaMm2: 228,
        referenceLabel: "EN 10055",
      },
      {
        id: "t35x4.5",
        label: "T 35×35×4.5",
        areaMm2: 298,
        referenceLabel: "EN 10055",
      },
      {
        id: "t40x5",
        label: "T 40×40×5",
        areaMm2: 375,
        referenceLabel: "EN 10055",
      },
      {
        id: "t45x5.5",
        label: "T 45×45×5.5",
        areaMm2: 466,
        referenceLabel: "EN 10055",
      },
      {
        id: "t50x6",
        label: "T 50×50×6",
        areaMm2: 564,
        referenceLabel: "EN 10055",
      },
      {
        id: "t60x7",
        label: "T 60×60×7",
        areaMm2: 791,
        referenceLabel: "EN 10055",
      },
      {
        id: "t70x7",
        label: "T 70×70×7",
        areaMm2: 929,
        referenceLabel: "EN 10055",
      },
      {
        id: "t80x8",
        label: "T 80×80×8",
        areaMm2: 1216,
        referenceLabel: "EN 10055",
      },
      {
        id: "t90x9",
        label: "T 90×90×9",
        areaMm2: 1536,
        referenceLabel: "EN 10055",
      },
      {
        id: "t100x10",
        label: "T 100×100×10",
        areaMm2: 1885,
        referenceLabel: "EN 10055",
      },
      {
        id: "t110x11",
        label: "T 110×110×11",
        areaMm2: 2281,
        referenceLabel: "EN 10055",
      },
      {
        id: "t120x12",
        label: "T 120×120×12",
        areaMm2: 2713,
        referenceLabel: "EN 10055",
      },
      {
        id: "t130x13",
        label: "T 130×130×13",
        areaMm2: 3178,
        referenceLabel: "EN 10055",
      },
      {
        id: "t140x14",
        label: "T 140×140×14",
        areaMm2: 3685,
        referenceLabel: "EN 10055",
      },
    ],
  },
];
