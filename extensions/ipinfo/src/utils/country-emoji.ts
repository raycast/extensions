export const getFlagEmoji = (countryCode: string) => {
  if (!/^[A-Z]{2}$/.test(countryCode.toUpperCase())) {
    return "";
  }

  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
};
