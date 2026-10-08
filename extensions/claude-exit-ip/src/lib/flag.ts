export function flagForCountryCode(countryCode: string | undefined): string {
  if (!countryCode || !/^[A-Za-z]{2}$/.test(countryCode)) return "";
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map((letter) => 127397 + letter.charCodeAt(0)));
}
