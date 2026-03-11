import type { StandardProfileDefinition } from "../types";

/*
 * perimeterMm — outer cross-section perimeter in mm, used for surface-area /
 * paint-quantity estimates (m²/m = perimeterMm / 1000).
 *
 * Formula used:  P = 2·b + 2·h
 *   b = flange width (mm)
 *   h = total section height (mm)
 *
 * For EN 10055 equal-leg tee sections b = h (nominal size), so:
 *   P = 4 · nominal_size
 *
 * This traces the full outer boundary of the T-section including the inner
 * flange return faces on each side of the web.  Corner-fillet corrections are
 * not applied.  Values rounded to nearest mm.
 */

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
        perimeterMm: 120,
        referenceLabel: "EN 10055",
      },
      {
        id: "t35x4.5",
        label: "T 35×35×4.5",
        areaMm2: 298,
        perimeterMm: 140,
        referenceLabel: "EN 10055",
      },
      {
        id: "t40x5",
        label: "T 40×40×5",
        areaMm2: 375,
        perimeterMm: 160,
        referenceLabel: "EN 10055",
      },
      {
        id: "t45x5.5",
        label: "T 45×45×5.5",
        areaMm2: 466,
        perimeterMm: 180,
        referenceLabel: "EN 10055",
      },
      {
        id: "t50x6",
        label: "T 50×50×6",
        areaMm2: 564,
        perimeterMm: 200,
        referenceLabel: "EN 10055",
      },
      {
        id: "t60x7",
        label: "T 60×60×7",
        areaMm2: 791,
        perimeterMm: 240,
        referenceLabel: "EN 10055",
      },
      {
        id: "t70x7",
        label: "T 70×70×7",
        areaMm2: 929,
        perimeterMm: 280,
        referenceLabel: "EN 10055",
      },
      {
        id: "t80x8",
        label: "T 80×80×8",
        areaMm2: 1216,
        perimeterMm: 320,
        referenceLabel: "EN 10055",
      },
      {
        id: "t90x9",
        label: "T 90×90×9",
        areaMm2: 1536,
        perimeterMm: 360,
        referenceLabel: "EN 10055",
      },
      {
        id: "t100x10",
        label: "T 100×100×10",
        areaMm2: 1885,
        perimeterMm: 400,
        referenceLabel: "EN 10055",
      },
      {
        id: "t110x11",
        label: "T 110×110×11",
        areaMm2: 2281,
        perimeterMm: 440,
        referenceLabel: "EN 10055",
      },
      {
        id: "t120x12",
        label: "T 120×120×12",
        areaMm2: 2713,
        perimeterMm: 480,
        referenceLabel: "EN 10055",
      },
      {
        id: "t130x13",
        label: "T 130×130×13",
        areaMm2: 3178,
        perimeterMm: 520,
        referenceLabel: "EN 10055",
      },
      {
        id: "t140x14",
        label: "T 140×140×14",
        areaMm2: 3685,
        perimeterMm: 560,
        referenceLabel: "EN 10055",
      },
    ],
  },
];
