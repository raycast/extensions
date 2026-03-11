import type { StandardProfileDefinition } from "../types";

/*
 * perimeterMm — outer cross-section perimeter in mm, used for surface-area /
 * paint-quantity estimates (m²/m = perimeterMm / 1000).
 *
 * Formula used:  P = 2·h + 4·b − 2·t_w
 *   h   = total section height (mm)
 *   b   = flange width (mm)
 *   t_w = web thickness (mm)
 *
 * This traces the full outer boundary of the C-section including both inner
 * flange return faces and the outer web face.  Corner-fillet corrections are
 * not applied (~2–3 % conservative overestimate vs. EN catalogue values).
 * Values rounded to nearest mm.
 */

export const CHANNEL_ANGLE_PROFILES: StandardProfileDefinition[] = [
  /* ------------------------------------------------------------------ */
  /*  UPN Channel (EN 10365)                                            */
  /*  Dimensions: h × b / t_w  (mm)                                    */
  /*  UPN  50:  50×38/5     UPN  65:  65×42/5.5   UPN  80:  80×45/6   */
  /*  UPN 100: 100×50/6     UPN 120: 120×55/7     UPN 140: 140×60/7   */
  /*  UPN 160: 160×65/7.5   UPN 180: 180×70/8     UPN 200: 200×75/8.5 */
  /*  UPN 220: 220×80/9     UPN 240: 240×85/9.5   UPN 260: 260×90/10  */
  /*  UPN 280: 280×95/10    UPN 300: 300×100/10   UPN 320: 320×100/14 */
  /*  UPN 400: 400×110/14                                              */
  /* ------------------------------------------------------------------ */
  {
    id: "channel_upn_en",
    label: "UPN Channel",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10365",
    sizes: [
      {
        id: "upn50",
        label: "UPN 50",
        areaMm2: 714,
        perimeterMm: 242,
        referenceLabel: "EN 10365",
      },
      {
        id: "upn65",
        label: "UPN 65",
        areaMm2: 903,
        perimeterMm: 287,
        referenceLabel: "EN 10365",
      },
      {
        id: "upn80",
        label: "UPN 80",
        areaMm2: 1100,
        perimeterMm: 328,
        referenceLabel: "EN 10365",
      },
      {
        id: "upn100",
        label: "UPN 100",
        areaMm2: 1350,
        perimeterMm: 388,
        referenceLabel: "EN 10365",
      },
      {
        id: "upn120",
        label: "UPN 120",
        areaMm2: 1707,
        perimeterMm: 446,
        referenceLabel: "EN 10365",
      },
      {
        id: "upn140",
        label: "UPN 140",
        areaMm2: 2040,
        perimeterMm: 506,
        referenceLabel: "EN 10365",
      },
      {
        id: "upn160",
        label: "UPN 160",
        areaMm2: 2395,
        perimeterMm: 565,
        referenceLabel: "EN 10365",
      },
      {
        id: "upn180",
        label: "UPN 180",
        areaMm2: 2800,
        perimeterMm: 624,
        referenceLabel: "EN 10365",
      },
      {
        id: "upn200",
        label: "UPN 200",
        areaMm2: 3223,
        perimeterMm: 683,
        referenceLabel: "EN 10365",
      },
      {
        id: "upn220",
        label: "UPN 220",
        areaMm2: 3748,
        perimeterMm: 742,
        referenceLabel: "EN 10365",
      },
      {
        id: "upn240",
        label: "UPN 240",
        areaMm2: 4230,
        perimeterMm: 801,
        referenceLabel: "EN 10365",
      },
      {
        id: "upn260",
        label: "UPN 260",
        areaMm2: 4833,
        perimeterMm: 860,
        referenceLabel: "EN 10365",
      },
      {
        id: "upn280",
        label: "UPN 280",
        areaMm2: 5320,
        perimeterMm: 920,
        referenceLabel: "EN 10365",
      },
      {
        id: "upn300",
        label: "UPN 300",
        areaMm2: 5878,
        perimeterMm: 980,
        referenceLabel: "EN 10365",
      },
      {
        id: "upn320",
        label: "UPN 320",
        areaMm2: 6475,
        perimeterMm: 1012,
        referenceLabel: "EN 10365",
      },
      {
        id: "upn400",
        label: "UPN 400",
        areaMm2: 9179,
        perimeterMm: 1212,
        referenceLabel: "EN 10365",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  UPE Channel (EN 10279)                                            */
  /*  Dimensions: h × b / t_w  (mm)                                    */
  /*  UPE  80:  80×50/4     UPE 100: 100×55/4.5  UPE 120: 120×60/5   */
  /*  UPE 140: 140×65/5     UPE 160: 160×74/6    UPE 180: 180×79/6   */
  /*  UPE 200: 200×80/6     UPE 220: 220×85/6.5  UPE 240: 240×85/6.5 */
  /*  UPE 270: 270×95/7     UPE 300: 300×100/7.5 UPE 330: 330×105/8  */
  /*  UPE 360: 360×110/8.5  UPE 400: 400×115/9                       */
  /* ------------------------------------------------------------------ */
  {
    id: "channel_upe_en",
    label: "UPE Channel",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10279",
    sizes: [
      {
        id: "upe80",
        label: "UPE 80",
        areaMm2: 1010,
        perimeterMm: 352,
        referenceLabel: "EN 10279",
      },
      {
        id: "upe100",
        label: "UPE 100",
        areaMm2: 1279,
        perimeterMm: 411,
        referenceLabel: "EN 10279",
      },
      {
        id: "upe120",
        label: "UPE 120",
        areaMm2: 1600,
        perimeterMm: 470,
        referenceLabel: "EN 10279",
      },
      {
        id: "upe140",
        label: "UPE 140",
        areaMm2: 1910,
        perimeterMm: 530,
        referenceLabel: "EN 10279",
      },
      {
        id: "upe160",
        label: "UPE 160",
        areaMm2: 2240,
        perimeterMm: 604,
        referenceLabel: "EN 10279",
      },
      {
        id: "upe180",
        label: "UPE 180",
        areaMm2: 2590,
        perimeterMm: 664,
        referenceLabel: "EN 10279",
      },
      {
        id: "upe200",
        label: "UPE 200",
        areaMm2: 2938,
        perimeterMm: 708,
        referenceLabel: "EN 10279",
      },
      {
        id: "upe220",
        label: "UPE 220",
        areaMm2: 3370,
        perimeterMm: 767,
        referenceLabel: "EN 10279",
      },
      {
        id: "upe240",
        label: "UPE 240",
        areaMm2: 3839,
        perimeterMm: 807,
        referenceLabel: "EN 10279",
      },
      {
        id: "upe270",
        label: "UPE 270",
        areaMm2: 4592,
        perimeterMm: 906,
        referenceLabel: "EN 10279",
      },
      {
        id: "upe300",
        label: "UPE 300",
        areaMm2: 5366,
        perimeterMm: 985,
        referenceLabel: "EN 10279",
      },
      {
        id: "upe330",
        label: "UPE 330",
        areaMm2: 6234,
        perimeterMm: 1064,
        referenceLabel: "EN 10279",
      },
      {
        id: "upe360",
        label: "UPE 360",
        areaMm2: 7218,
        perimeterMm: 1143,
        referenceLabel: "EN 10279",
      },
      {
        id: "upe400",
        label: "UPE 400",
        areaMm2: 8440,
        perimeterMm: 1242,
        referenceLabel: "EN 10279",
      },
    ],
  },
];
