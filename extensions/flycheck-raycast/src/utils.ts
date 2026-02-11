export function isValidIcaoCode(code: string): boolean {
  return /^[a-zA-Z]{4}$/.test(code);
}

// The test expects this function to exist.
// We are exporting it properly now.
export function parseMetar(raw: string) {
  return { raw_text: raw };
}
