/**
 * Static mapping of IATA airline codes to ICAO airline codes.
 * Used to convert user-friendly flight numbers (UA745) to ICAO callsigns (UAL745)
 * for OpenSky Network queries.
 */
const IATA_TO_ICAO: Record<string, string> = {
  // US Major
  AA: "AAL", // American Airlines
  DL: "DAL", // Delta Air Lines
  UA: "UAL", // United Airlines
  WN: "SWA", // Southwest Airlines
  B6: "JBU", // JetBlue Airways
  AS: "ASA", // Alaska Airlines
  NK: "NKS", // Spirit Airlines
  F9: "FFT", // Frontier Airlines
  HA: "HAL", // Hawaiian Airlines
  SY: "SCX", // Sun Country Airlines
  G4: "AAY", // Allegiant Air

  // Canadian
  AC: "ACA", // Air Canada
  WS: "WJA", // WestJet

  // European
  BA: "BAW", // British Airways
  LH: "DLH", // Lufthansa
  AF: "AFR", // Air France
  KL: "KLM", // KLM
  IB: "IBE", // Iberia
  AZ: "ITY", // ITA Airways
  SK: "SAS", // SAS
  LX: "SWR", // Swiss International Air Lines
  OS: "AUA", // Austrian Airlines
  SN: "BEL", // Brussels Airlines
  EI: "EIN", // Aer Lingus
  AY: "FIN", // Finnair
  TP: "TAP", // TAP Air Portugal
  TK: "THY", // Turkish Airlines
  VS: "VIR", // Virgin Atlantic

  // Low-cost European
  FR: "RYR", // Ryanair
  U2: "EZY", // easyJet
  W6: "WZZ", // Wizz Air
  VY: "VLG", // Vueling

  // Middle Eastern
  EK: "UAE", // Emirates
  QR: "QTR", // Qatar Airways
  EY: "ETD", // Etihad Airways
  SV: "SVA", // Saudia

  // Asian
  CX: "CPA", // Cathay Pacific
  SQ: "SIA", // Singapore Airlines
  NH: "ANA", // All Nippon Airways
  JL: "JAL", // Japan Airlines
  KE: "KAL", // Korean Air
  OZ: "AAR", // Asiana Airlines
  CI: "CAL", // China Airlines
  BR: "EVA", // EVA Air
  TG: "THA", // Thai Airways
  MH: "MAS", // Malaysia Airlines
  GA: "GIA", // Garuda Indonesia
  AI: "AIC", // Air India
  CZ: "CSN", // China Southern Airlines
  MU: "CES", // China Eastern Airlines
  CA: "CCA", // Air China
  HU: "CHH", // Hainan Airlines

  // Oceania
  QF: "QFA", // Qantas
  NZ: "ANZ", // Air New Zealand

  // Latin American
  AM: "AMX", // Aeromexico
  AV: "AVA", // Avianca
  LA: "LAN", // LATAM Airlines
  CM: "CMP", // Copa Airlines
  AR: "ARG", // Aerolineas Argentinas
  G3: "GLO", // Gol Linhas Aereas

  // African
  ET: "ETH", // Ethiopian Airlines
  SA: "SAA", // South African Airways
  MS: "MSR", // EgyptAir
  AT: "RAM", // Royal Air Maroc

  // Cargo (common)
  "5X": "UPS", // UPS Airlines
  FX: "FDX", // FedEx Express
};

/** Reverse lookup: ICAO airline code → IATA code (precomputed once). */
const ICAO_TO_IATA: Record<string, string> = Object.fromEntries(
  Object.entries(IATA_TO_ICAO).map(([iata, icao]) => [icao, iata]),
);

/** A valid flight number suffix: digits with an optional trailing letter. */
const FLIGHT_NUMBER_SUFFIX = /^\d+[A-Z]?$/;

/**
 * Convert a flight number to an ICAO callsign.
 * Accepts both IATA (e.g., "UA745") and ICAO (e.g., "UAL745") formats, ignoring
 * surrounding and internal whitespace (e.g. "UA 745").
 * Returns null if the airline code is not recognized or the flight number is
 * missing (e.g. a bare "UA").
 */
export function toIcaoCallsign(flightNumber: string): string | null {
  const normalized = flightNumber.replace(/\s+/g, "").toUpperCase();

  // Try 3-letter ICAO code first (e.g., UAL745)
  const icao3 = normalized.slice(0, 3);
  if (ICAO_TO_IATA[icao3]) {
    const suffix = normalized.slice(3);
    return FLIGHT_NUMBER_SUFFIX.test(suffix) ? normalized : null;
  }

  // Try 2-letter IATA code (e.g., UA745)
  const iata2 = normalized.slice(0, 2);
  const icaoCode = IATA_TO_ICAO[iata2];
  if (icaoCode) {
    const suffix = normalized.slice(2);
    return FLIGHT_NUMBER_SUFFIX.test(suffix) ? icaoCode + suffix : null;
  }

  return null;
}

/**
 * Extract the 2-character IATA airline code from a flight number.
 * Accepts both IATA (e.g., "UA745" → "UA") and ICAO (e.g., "UAL745" → "UA")
 * formats, ignoring surrounding and internal whitespace.
 * Returns null if the airline is not recognized.
 */
export function toIataAirlineCode(flightNumber: string): string | null {
  const normalized = flightNumber.replace(/\s+/g, "").toUpperCase();

  const icao3 = normalized.slice(0, 3);
  if (ICAO_TO_IATA[icao3]) {
    return ICAO_TO_IATA[icao3];
  }

  const iata2 = normalized.slice(0, 2);
  if (IATA_TO_ICAO[iata2]) {
    return iata2;
  }

  return null;
}

/**
 * Extract the display-friendly flight number.
 * If the input is ICAO (e.g., "UAL745"), converts to IATA (e.g., "UA745").
 * If already IATA or unknown, returns as-is (uppercased).
 */
export function toDisplayFlightNumber(flightNumber: string): string {
  const normalized = flightNumber.replace(/\s+/g, "").toUpperCase();

  // Check if it starts with a known ICAO code
  const icao3 = normalized.slice(0, 3);
  const iata = ICAO_TO_IATA[icao3];
  if (iata) {
    return iata + normalized.slice(3);
  }

  return normalized;
}
