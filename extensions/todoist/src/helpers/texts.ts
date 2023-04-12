export const truncateMiddle = (fullStr: string, strLen: number, separator = "...") => {
  if (fullStr.length <= strLen) return fullStr;

  const sepLen = separator.length;
  const charsToShow = strLen - sepLen;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);

  return fullStr.slice(0, frontChars) + separator + fullStr.slice(fullStr.length - backChars);
};
