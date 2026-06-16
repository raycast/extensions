// ESPN reports teams with FIFA 3-letter tricodes (ESP, CPV…), but flag emojis
// are built from ISO 3166-1 alpha-2 codes (ES, CV…). This maps the tricodes we
// expect at the World Cup to ISO-2, then renders the regional-indicator emoji.

const TRICODE_TO_ISO2: Record<string, string> = {
  AFG: "AF",
  ALG: "DZ",
  ANG: "AO",
  ARG: "AR",
  AUS: "AU",
  AUT: "AT",
  BEL: "BE",
  BOL: "BO",
  BRA: "BR",
  CMR: "CM",
  CAN: "CA",
  CHI: "CL",
  CHN: "CN",
  COL: "CO",
  CRC: "CR",
  CRO: "HR",
  CPV: "CV",
  CIV: "CI",
  CZE: "CZ",
  DEN: "DK",
  ECU: "EC",
  EGY: "EG",
  ESP: "ES",
  FRA: "FR",
  GER: "DE",
  GHA: "GH",
  GRE: "GR",
  HAI: "HT",
  HON: "HN",
  IRN: "IR",
  IRQ: "IQ",
  ITA: "IT",
  JAM: "JM",
  JPN: "JP",
  JOR: "JO",
  KOR: "KR",
  PRK: "KP",
  KSA: "SA",
  MEX: "MX",
  MAR: "MA",
  NED: "NL",
  NGA: "NG",
  NZL: "NZ",
  NOR: "NO",
  PAN: "PA",
  PAR: "PY",
  PER: "PE",
  POL: "PL",
  POR: "PT",
  QAT: "QA",
  IRL: "IE",
  RSA: "ZA",
  SEN: "SN",
  SRB: "RS",
  SVK: "SK",
  SVN: "SI",
  SUI: "CH",
  SWE: "SE",
  TUN: "TN",
  TUR: "TR",
  UAE: "AE",
  UKR: "UA",
  URU: "UY",
  USA: "US",
  UZB: "UZ",
  VEN: "VE",
  COD: "CD",
  CGO: "CG",
  GAB: "GA",
  MLI: "ML",
  BFA: "BF",
  ZAM: "ZM",
  GUI: "GN",
  BEN: "BJ",
  MTN: "MR",
  NAM: "NA",
  TOG: "TG",
  UGA: "UG",
  CUW: "CW",
  TRI: "TT",
  SUR: "SR",
  GUA: "GT",
  SLV: "SV",
  NCA: "NI",
  THA: "TH",
  VIE: "VN",
  IDN: "ID",
  MAS: "MY",
  PHI: "PH",
  BHR: "BH",
  KUW: "KW",
  OMA: "OM",
  LBN: "LB",
  SYR: "SY",
  PLE: "PS",
  YEM: "YE",
};

// England, Scotland, Wales have no ISO-2 — they use subdivision-tag emoji.
const SPECIAL: Record<string, string> = {
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  WAL: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
};

function isoToEmoji(iso2: string): string {
  return [...iso2.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

/** Flag emoji for a FIFA tricode. Falls back to ⚽ for anything unmapped. */
export function flag(tricode: string): string {
  const code = tricode?.toUpperCase();
  if (SPECIAL[code]) return SPECIAL[code];
  const iso2 = TRICODE_TO_ISO2[code];
  return iso2 ? isoToEmoji(iso2) : "⚽";
}
