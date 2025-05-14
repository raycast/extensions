const getFlag = (countryCode: string) => {
  if (!/^[A-Z]{2}$/.test(countryCode.toUpperCase())) {
    return null;
  }

  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
    .join("");
};

const getFlagPrefix = (countryCode: string) => {
  const flag = getFlag(countryCode);
  if (!flag) return "";

  return `${flag} `;
};

export default getFlagPrefix;
