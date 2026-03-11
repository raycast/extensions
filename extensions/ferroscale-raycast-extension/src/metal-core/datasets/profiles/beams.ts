import type { StandardProfileDefinition } from "../types";

/*
 * perimeterMm — outer cross-section perimeter in mm, used for surface-area /
 * paint-quantity estimates (m²/m = perimeterMm / 1000).
 *
 * Formula used:  P = 2·h + 4·b − 2·t_w
 *   h  = total section height (mm)
 *   b  = flange width (mm)
 *   t_w = web thickness (mm)
 *
 * This traces the full outer boundary including inner flange return faces.
 * Corner-fillet corrections are not applied (~2–3 % conservative overestimate
 * vs. published EN catalogue values).  Values rounded to nearest mm.
 */

export const BEAM_PROFILES: StandardProfileDefinition[] = [
  /* ------------------------------------------------------------------ */
  /*  IPE – European I-Beam (EN 10365)                                  */
  /*  Dimensions: h × b / t_w  (mm)                                     */
  /*  IPE  80: 80×46/3.8   IPE 100: 100×55/4.1   IPE 120: 120×64/4.4   */
  /*  IPE 140: 140×73/4.7  IPE 160: 160×82/5.0   IPE 180: 180×91/5.3   */
  /*  IPE 200: 200×100/5.6 IPE 220: 220×110/5.9  IPE 240: 240×120/6.2  */
  /*  IPE 270: 270×135/6.6 IPE 300: 300×150/7.1  IPE 330: 330×160/7.5  */
  /*  IPE 360: 360×170/8.0 IPE 400: 400×180/8.6  IPE 450: 450×190/9.4  */
  /*  IPE 500: 500×200/10.2 IPE 550: 550×210/11.1 IPE 600: 600×220/12.0 */
  /* ------------------------------------------------------------------ */
  {
    id: "beam_ipe_en",
    label: "IPE Beam",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10365",
    sizes: [
      {
        id: "ipe80",
        label: "IPE 80",
        areaMm2: 764,
        perimeterMm: 336,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe100",
        label: "IPE 100",
        areaMm2: 1032,
        perimeterMm: 412,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe120",
        label: "IPE 120",
        areaMm2: 1321,
        perimeterMm: 487,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe140",
        label: "IPE 140",
        areaMm2: 1643,
        perimeterMm: 563,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe160",
        label: "IPE 160",
        areaMm2: 2009,
        perimeterMm: 638,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe180",
        label: "IPE 180",
        areaMm2: 2395,
        perimeterMm: 713,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe200",
        label: "IPE 200",
        areaMm2: 2848,
        perimeterMm: 789,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe220",
        label: "IPE 220",
        areaMm2: 3337,
        perimeterMm: 868,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe240",
        label: "IPE 240",
        areaMm2: 3912,
        perimeterMm: 948,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe270",
        label: "IPE 270",
        areaMm2: 4594,
        perimeterMm: 1067,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe300",
        label: "IPE 300",
        areaMm2: 5381,
        perimeterMm: 1186,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe330",
        label: "IPE 330",
        areaMm2: 6261,
        perimeterMm: 1285,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe360",
        label: "IPE 360",
        areaMm2: 7273,
        perimeterMm: 1384,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe400",
        label: "IPE 400",
        areaMm2: 8446,
        perimeterMm: 1503,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe450",
        label: "IPE 450",
        areaMm2: 9882,
        perimeterMm: 1641,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe500",
        label: "IPE 500",
        areaMm2: 11552,
        perimeterMm: 1780,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe550",
        label: "IPE 550",
        areaMm2: 13442,
        perimeterMm: 1918,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe600",
        label: "IPE 600",
        areaMm2: 15598,
        perimeterMm: 2056,
        referenceLabel: "EN 10365",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  IPN – Standard I-Beam (EN 10024)                                  */
  /*  Dimensions: h × b / t_w  (mm)                                     */
  /*  IPN  80:  80×42/3.9   IPN 100: 100×50/4.5  IPN 120: 120×58/5.1   */
  /*  IPN 140: 140×66/5.7   IPN 160: 160×74/6.3  IPN 180: 180×82/6.9   */
  /*  IPN 200: 200×90/7.5   IPN 220: 220×98/8.1  IPN 240: 240×106/8.7  */
  /*  IPN 260: 260×113/9.4  IPN 280: 280×119/10.1 IPN 300: 300×125/10.8 */
  /*  IPN 320: 320×131/11.5 IPN 340: 340×137/12.2 IPN 360: 360×143/13.0 */
  /*  IPN 380: 380×149/13.7 IPN 400: 400×155/14.4                       */
  /* ------------------------------------------------------------------ */
  {
    id: "beam_ipn_en",
    label: "IPN Beam",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10024",
    sizes: [
      {
        id: "ipn80",
        label: "IPN 80",
        areaMm2: 786,
        perimeterMm: 320,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn100",
        label: "IPN 100",
        areaMm2: 1058,
        perimeterMm: 391,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn120",
        label: "IPN 120",
        areaMm2: 1422,
        perimeterMm: 462,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn140",
        label: "IPN 140",
        areaMm2: 1826,
        perimeterMm: 533,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn160",
        label: "IPN 160",
        areaMm2: 2282,
        perimeterMm: 603,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn180",
        label: "IPN 180",
        areaMm2: 2790,
        perimeterMm: 674,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn200",
        label: "IPN 200",
        areaMm2: 3352,
        perimeterMm: 745,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn220",
        label: "IPN 220",
        areaMm2: 3942,
        perimeterMm: 816,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn240",
        label: "IPN 240",
        areaMm2: 4614,
        perimeterMm: 887,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn260",
        label: "IPN 260",
        areaMm2: 5314,
        perimeterMm: 953,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn280",
        label: "IPN 280",
        areaMm2: 6096,
        perimeterMm: 1016,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn300",
        label: "IPN 300",
        areaMm2: 6908,
        perimeterMm: 1078,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn320",
        label: "IPN 320",
        areaMm2: 7827,
        perimeterMm: 1141,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn340",
        label: "IPN 340",
        areaMm2: 8686,
        perimeterMm: 1204,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn360",
        label: "IPN 360",
        areaMm2: 9704,
        perimeterMm: 1266,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn380",
        label: "IPN 380",
        areaMm2: 10738,
        perimeterMm: 1329,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn400",
        label: "IPN 400",
        areaMm2: 11826,
        perimeterMm: 1391,
        referenceLabel: "EN 10024",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  HEA – Wide Flange Light (EN 10365)                                */
  /*  Dimensions: h × b / t_w  (mm)                                     */
  /*  HEA 100: 96×100/5    HEA 120: 114×120/5   HEA 140: 133×140/5.5   */
  /*  HEA 160: 152×160/6   HEA 180: 171×180/6   HEA 200: 190×200/6.5   */
  /*  HEA 220: 210×220/7   HEA 240: 230×240/7.5  HEA 260: 250×260/7.5  */
  /*  HEA 280: 270×280/8   HEA 300: 290×300/8.5  HEA 320: 310×300/9    */
  /*  HEA 340: 330×300/9.5 HEA 360: 350×300/10   HEA 400: 390×300/11   */
  /*  HEA 450: 440×300/11.5 HEA 500: 490×300/12  HEA 550: 540×300/12.5 */
  /*  HEA 600: 590×300/13  HEA 650: 640×300/13.5 HEA 700: 690×300/14.5 */
  /*  HEA 800: 790×300/15  HEA 900: 890×300/16   HEA 1000: 990×300/16.5*/
  /* ------------------------------------------------------------------ */
  {
    id: "beam_hea_en",
    label: "HEA Beam",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10365",
    sizes: [
      {
        id: "hea100",
        label: "HEA 100",
        areaMm2: 2124,
        perimeterMm: 582,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea120",
        label: "HEA 120",
        areaMm2: 2534,
        perimeterMm: 698,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea140",
        label: "HEA 140",
        areaMm2: 3142,
        perimeterMm: 815,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea160",
        label: "HEA 160",
        areaMm2: 3877,
        perimeterMm: 932,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea180",
        label: "HEA 180",
        areaMm2: 4525,
        perimeterMm: 1050,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea200",
        label: "HEA 200",
        areaMm2: 5383,
        perimeterMm: 1167,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea220",
        label: "HEA 220",
        areaMm2: 6434,
        perimeterMm: 1286,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea240",
        label: "HEA 240",
        areaMm2: 7684,
        perimeterMm: 1405,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea260",
        label: "HEA 260",
        areaMm2: 8682,
        perimeterMm: 1525,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea280",
        label: "HEA 280",
        areaMm2: 9726,
        perimeterMm: 1644,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea300",
        label: "HEA 300",
        areaMm2: 11253,
        perimeterMm: 1763,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea320",
        label: "HEA 320",
        areaMm2: 12444,
        perimeterMm: 1802,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea340",
        label: "HEA 340",
        areaMm2: 13330,
        perimeterMm: 1841,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea360",
        label: "HEA 360",
        areaMm2: 14278,
        perimeterMm: 1880,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea400",
        label: "HEA 400",
        areaMm2: 15898,
        perimeterMm: 1958,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea450",
        label: "HEA 450",
        areaMm2: 17800,
        perimeterMm: 2057,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea500",
        label: "HEA 500",
        areaMm2: 19782,
        perimeterMm: 2156,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea550",
        label: "HEA 550",
        areaMm2: 21192,
        perimeterMm: 2255,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea600",
        label: "HEA 600",
        areaMm2: 22646,
        perimeterMm: 2354,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea650",
        label: "HEA 650",
        areaMm2: 24158,
        perimeterMm: 2453,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea700",
        label: "HEA 700",
        areaMm2: 26058,
        perimeterMm: 2551,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea800",
        label: "HEA 800",
        areaMm2: 28558,
        perimeterMm: 2750,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea900",
        label: "HEA 900",
        areaMm2: 32098,
        perimeterMm: 2948,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea1000",
        label: "HEA 1000",
        areaMm2: 34698,
        perimeterMm: 3147,
        referenceLabel: "EN 10365",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  HEB – Wide Flange Medium (EN 10365)                               */
  /*  Dimensions: h × b / t_w  (mm)                                     */
  /*  HEB 100: 100×100/6    HEB 120: 120×120/6.5  HEB 140: 140×140/7   */
  /*  HEB 160: 160×160/8    HEB 180: 180×180/8.5  HEB 200: 200×200/9   */
  /*  HEB 220: 220×220/9.5  HEB 240: 240×240/10   HEB 260: 260×260/10  */
  /*  HEB 280: 280×280/10.5 HEB 300: 300×300/11   HEB 320: 320×300/11.5*/
  /*  HEB 340: 340×300/12   HEB 360: 360×300/12.5 HEB 400: 400×300/13.5*/
  /*  HEB 450: 450×300/14   HEB 500: 500×300/14.5 HEB 550: 550×300/15  */
  /*  HEB 600: 600×300/15.5 HEB 650: 650×300/16   HEB 700: 700×300/17  */
  /*  HEB 800: 800×300/17.5 HEB 900: 900×300/18.5 HEB 1000:1000×300/19 */
  /* ------------------------------------------------------------------ */
  {
    id: "beam_heb_en",
    label: "HEB Beam",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10365",
    sizes: [
      {
        id: "heb100",
        label: "HEB 100",
        areaMm2: 2604,
        perimeterMm: 588,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb120",
        label: "HEB 120",
        areaMm2: 3401,
        perimeterMm: 707,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb140",
        label: "HEB 140",
        areaMm2: 4296,
        perimeterMm: 826,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb160",
        label: "HEB 160",
        areaMm2: 5425,
        perimeterMm: 944,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb180",
        label: "HEB 180",
        areaMm2: 6525,
        perimeterMm: 1063,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb200",
        label: "HEB 200",
        areaMm2: 7808,
        perimeterMm: 1182,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb220",
        label: "HEB 220",
        areaMm2: 9104,
        perimeterMm: 1301,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb240",
        label: "HEB 240",
        areaMm2: 10600,
        perimeterMm: 1420,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb260",
        label: "HEB 260",
        areaMm2: 11845,
        perimeterMm: 1540,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb280",
        label: "HEB 280",
        areaMm2: 13138,
        perimeterMm: 1659,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb300",
        label: "HEB 300",
        areaMm2: 14908,
        perimeterMm: 1778,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb320",
        label: "HEB 320",
        areaMm2: 16129,
        perimeterMm: 1817,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb340",
        label: "HEB 340",
        areaMm2: 17090,
        perimeterMm: 1856,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb360",
        label: "HEB 360",
        areaMm2: 18060,
        perimeterMm: 1895,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb400",
        label: "HEB 400",
        areaMm2: 19782,
        perimeterMm: 1973,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb450",
        label: "HEB 450",
        areaMm2: 21808,
        perimeterMm: 2072,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb500",
        label: "HEB 500",
        areaMm2: 23858,
        perimeterMm: 2171,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb550",
        label: "HEB 550",
        areaMm2: 25358,
        perimeterMm: 2270,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb600",
        label: "HEB 600",
        areaMm2: 27000,
        perimeterMm: 2369,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb650",
        label: "HEB 650",
        areaMm2: 28558,
        perimeterMm: 2468,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb700",
        label: "HEB 700",
        areaMm2: 30638,
        perimeterMm: 2566,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb800",
        label: "HEB 800",
        areaMm2: 33438,
        perimeterMm: 2765,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb900",
        label: "HEB 900",
        areaMm2: 37098,
        perimeterMm: 2963,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb1000",
        label: "HEB 1000",
        areaMm2: 40000,
        perimeterMm: 3162,
        referenceLabel: "EN 10365",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  HEM – Wide Flange Heavy (EN 10365)                                */
  /*  Dimensions: h × b / t_w  (mm)                                     */
  /*  HEM 100: 120×106/12   HEM 120: 140×126/12.5 HEM 140: 160×146/13  */
  /*  HEM 160: 180×166/14   HEM 180: 200×186/14.5 HEM 200: 220×206/15  */
  /*  HEM 220: 240×226/15.5 HEM 240: 270×248/18   HEM 260: 290×268/18  */
  /*  HEM 280: 310×288/18.5 HEM 300: 340×310/21                        */
  /* ------------------------------------------------------------------ */
  {
    id: "beam_hem_en",
    label: "HEM Beam",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10365",
    sizes: [
      {
        id: "hem100",
        label: "HEM 100",
        areaMm2: 5320,
        perimeterMm: 640,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem120",
        label: "HEM 120",
        areaMm2: 6621,
        perimeterMm: 759,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem140",
        label: "HEM 140",
        areaMm2: 8135,
        perimeterMm: 878,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem160",
        label: "HEM 160",
        areaMm2: 9726,
        perimeterMm: 996,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem180",
        label: "HEM 180",
        areaMm2: 11320,
        perimeterMm: 1115,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem200",
        label: "HEM 200",
        areaMm2: 13130,
        perimeterMm: 1234,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem220",
        label: "HEM 220",
        areaMm2: 14943,
        perimeterMm: 1353,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem240",
        label: "HEM 240",
        areaMm2: 19990,
        perimeterMm: 1496,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem260",
        label: "HEM 260",
        areaMm2: 22042,
        perimeterMm: 1616,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem280",
        label: "HEM 280",
        areaMm2: 24024,
        perimeterMm: 1735,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem300",
        label: "HEM 300",
        areaMm2: 30310,
        perimeterMm: 1878,
        referenceLabel: "EN 10365",
      },
    ],
  },
];
