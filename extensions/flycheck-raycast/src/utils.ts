export function isValidIcaoCode(text: string) {
  return /^[a-zA-Z]{4}$/.test(text);
}