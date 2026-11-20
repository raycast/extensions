// The governed rule in jumpseat-mobile Contracts/FlightDesignators: the only
// place an airline code and a flight number become one visible designator.
// Stored numbers arrive both bare ("459") and already prefixed ("LH459",
// "lh 459"), so callers must never join the two values themselves.

export interface FlightDesignatorInput {
  airlineCode?: string | null;
  alternateAirlineCode?: string | null;
  flightNumber?: string | null;
}

export interface FlightDesignator {
  airlineCode: string | null;
  flightNumber: string;
}

export type FlightDesignatorStyle = "compact" | "spaced";

const WHITESPACE = /\p{White_Space}/gu;
const CODE = /^[A-Z0-9]{2,3}$/;
const LETTER = /[A-Z]/;
const CORE = /^[0-9]+[A-Z]?$/;
const FOREIGN = /^([A-Z]{3}|[A-Z][A-Z0-9]|[0-9][A-Z])([0-9]{1,5}[A-Z]?)$/;

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(WHITESPACE, "").toUpperCase();
}

function carrierCode(value: string | null | undefined): string | null {
  const code = normalize(value);
  return CODE.test(code) && LETTER.test(code) ? code : null;
}

export function parseFlightDesignator(
  input: FlightDesignatorInput,
): FlightDesignator | null {
  const number = normalize(input.flightNumber);
  if (!number) return null;

  const codes = [
    carrierCode(input.airlineCode),
    carrierCode(input.alternateAirlineCode),
  ].filter((code): code is string => code !== null);
  const shownCode = codes[0] ?? null;

  for (const code of codes) {
    if (number.startsWith(code)) {
      const rest = number.slice(code.length);
      if (CORE.test(rest)) {
        return { airlineCode: shownCode, flightNumber: rest };
      }
    }
  }
  if (CORE.test(number)) {
    return { airlineCode: shownCode, flightNumber: number };
  }

  const foreign = FOREIGN.exec(number);
  if (foreign?.[1] && foreign[2]) {
    return { airlineCode: foreign[1], flightNumber: foreign[2] };
  }

  return { airlineCode: null, flightNumber: number };
}

export function formatFlightDesignator(
  designator: FlightDesignator | null,
  style: FlightDesignatorStyle,
): string {
  if (!designator) return "";
  if (!designator.airlineCode) return designator.flightNumber;
  return style === "spaced"
    ? `${designator.airlineCode} ${designator.flightNumber}`
    : `${designator.airlineCode}${designator.flightNumber}`;
}
