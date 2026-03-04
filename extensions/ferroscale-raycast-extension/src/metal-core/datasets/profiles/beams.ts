import type { StandardProfileDefinition } from "../types";

export const BEAM_PROFILES: StandardProfileDefinition[] = [
  /* ------------------------------------------------------------------ */
  /*  IPE – European I-Beam (EN 10365)                                  */
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
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe100",
        label: "IPE 100",
        areaMm2: 1032,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe120",
        label: "IPE 120",
        areaMm2: 1321,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe140",
        label: "IPE 140",
        areaMm2: 1643,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe160",
        label: "IPE 160",
        areaMm2: 2009,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe180",
        label: "IPE 180",
        areaMm2: 2395,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe200",
        label: "IPE 200",
        areaMm2: 2848,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe220",
        label: "IPE 220",
        areaMm2: 3337,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe240",
        label: "IPE 240",
        areaMm2: 3912,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe270",
        label: "IPE 270",
        areaMm2: 4594,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe300",
        label: "IPE 300",
        areaMm2: 5381,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe330",
        label: "IPE 330",
        areaMm2: 6261,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe360",
        label: "IPE 360",
        areaMm2: 7273,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe400",
        label: "IPE 400",
        areaMm2: 8446,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe450",
        label: "IPE 450",
        areaMm2: 9882,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe500",
        label: "IPE 500",
        areaMm2: 11552,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe550",
        label: "IPE 550",
        areaMm2: 13442,
        referenceLabel: "EN 10365",
      },
      {
        id: "ipe600",
        label: "IPE 600",
        areaMm2: 15598,
        referenceLabel: "EN 10365",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  IPN – Standard I-Beam (EN 10024)                                  */
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
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn100",
        label: "IPN 100",
        areaMm2: 1058,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn120",
        label: "IPN 120",
        areaMm2: 1422,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn140",
        label: "IPN 140",
        areaMm2: 1826,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn160",
        label: "IPN 160",
        areaMm2: 2282,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn180",
        label: "IPN 180",
        areaMm2: 2790,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn200",
        label: "IPN 200",
        areaMm2: 3352,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn220",
        label: "IPN 220",
        areaMm2: 3942,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn240",
        label: "IPN 240",
        areaMm2: 4614,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn260",
        label: "IPN 260",
        areaMm2: 5314,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn280",
        label: "IPN 280",
        areaMm2: 6096,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn300",
        label: "IPN 300",
        areaMm2: 6908,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn320",
        label: "IPN 320",
        areaMm2: 7827,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn340",
        label: "IPN 340",
        areaMm2: 8686,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn360",
        label: "IPN 360",
        areaMm2: 9704,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn380",
        label: "IPN 380",
        areaMm2: 10738,
        referenceLabel: "EN 10024",
      },
      {
        id: "ipn400",
        label: "IPN 400",
        areaMm2: 11826,
        referenceLabel: "EN 10024",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  HEA – Wide Flange Light (EN 10365)                                */
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
        referenceLabel: "EN 10365",
      },
      {
        id: "hea120",
        label: "HEA 120",
        areaMm2: 2534,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea140",
        label: "HEA 140",
        areaMm2: 3142,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea160",
        label: "HEA 160",
        areaMm2: 3877,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea180",
        label: "HEA 180",
        areaMm2: 4525,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea200",
        label: "HEA 200",
        areaMm2: 5383,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea220",
        label: "HEA 220",
        areaMm2: 6434,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea240",
        label: "HEA 240",
        areaMm2: 7684,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea260",
        label: "HEA 260",
        areaMm2: 8682,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea280",
        label: "HEA 280",
        areaMm2: 9726,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea300",
        label: "HEA 300",
        areaMm2: 11253,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea320",
        label: "HEA 320",
        areaMm2: 12444,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea340",
        label: "HEA 340",
        areaMm2: 13330,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea360",
        label: "HEA 360",
        areaMm2: 14278,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea400",
        label: "HEA 400",
        areaMm2: 15898,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea450",
        label: "HEA 450",
        areaMm2: 17800,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea500",
        label: "HEA 500",
        areaMm2: 19782,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea550",
        label: "HEA 550",
        areaMm2: 21192,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea600",
        label: "HEA 600",
        areaMm2: 22646,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea650",
        label: "HEA 650",
        areaMm2: 24158,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea700",
        label: "HEA 700",
        areaMm2: 26058,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea800",
        label: "HEA 800",
        areaMm2: 28558,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea900",
        label: "HEA 900",
        areaMm2: 32098,
        referenceLabel: "EN 10365",
      },
      {
        id: "hea1000",
        label: "HEA 1000",
        areaMm2: 34698,
        referenceLabel: "EN 10365",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  HEB – Wide Flange Medium (EN 10365)                               */
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
        referenceLabel: "EN 10365",
      },
      {
        id: "heb120",
        label: "HEB 120",
        areaMm2: 3401,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb140",
        label: "HEB 140",
        areaMm2: 4296,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb160",
        label: "HEB 160",
        areaMm2: 5425,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb180",
        label: "HEB 180",
        areaMm2: 6525,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb200",
        label: "HEB 200",
        areaMm2: 7808,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb220",
        label: "HEB 220",
        areaMm2: 9104,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb240",
        label: "HEB 240",
        areaMm2: 10600,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb260",
        label: "HEB 260",
        areaMm2: 11845,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb280",
        label: "HEB 280",
        areaMm2: 13138,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb300",
        label: "HEB 300",
        areaMm2: 14908,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb320",
        label: "HEB 320",
        areaMm2: 16129,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb340",
        label: "HEB 340",
        areaMm2: 17090,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb360",
        label: "HEB 360",
        areaMm2: 18060,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb400",
        label: "HEB 400",
        areaMm2: 19782,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb450",
        label: "HEB 450",
        areaMm2: 21808,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb500",
        label: "HEB 500",
        areaMm2: 23858,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb550",
        label: "HEB 550",
        areaMm2: 25358,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb600",
        label: "HEB 600",
        areaMm2: 27000,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb650",
        label: "HEB 650",
        areaMm2: 28558,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb700",
        label: "HEB 700",
        areaMm2: 30638,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb800",
        label: "HEB 800",
        areaMm2: 33438,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb900",
        label: "HEB 900",
        areaMm2: 37098,
        referenceLabel: "EN 10365",
      },
      {
        id: "heb1000",
        label: "HEB 1000",
        areaMm2: 40000,
        referenceLabel: "EN 10365",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  HEM – Wide Flange Heavy (EN 10365)                                */
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
        referenceLabel: "EN 10365",
      },
      {
        id: "hem120",
        label: "HEM 120",
        areaMm2: 6621,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem140",
        label: "HEM 140",
        areaMm2: 8135,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem160",
        label: "HEM 160",
        areaMm2: 9726,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem180",
        label: "HEM 180",
        areaMm2: 11320,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem200",
        label: "HEM 200",
        areaMm2: 13130,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem220",
        label: "HEM 220",
        areaMm2: 14943,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem240",
        label: "HEM 240",
        areaMm2: 19990,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem260",
        label: "HEM 260",
        areaMm2: 22042,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem280",
        label: "HEM 280",
        areaMm2: 24024,
        referenceLabel: "EN 10365",
      },
      {
        id: "hem300",
        label: "HEM 300",
        areaMm2: 30310,
        referenceLabel: "EN 10365",
      },
    ],
  },
];
