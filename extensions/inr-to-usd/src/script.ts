export function convertToInternationalCurrencySystem(
  labelValue: number,
): string {
  // Nine Zeroes for Billions
  return Math.abs(Number(labelValue)) >= 1.0e9
    ? (Math.abs(Number(labelValue)) / 1.0e9).toFixed(2) + "B"
    : // Six Zeroes for Millions
      Math.abs(Number(labelValue)) >= 1.0e6
      ? (Math.abs(Number(labelValue)) / 1.0e6).toFixed(2) + "M"
      : // Three Zeroes for Thousands
        Math.abs(Number(labelValue)) >= 1.0e3
        ? (Math.abs(Number(labelValue)) / 1.0e3).toFixed(2) + "K"
        : Math.abs(Number(labelValue)).toString();
}

export function reformatCurrencyArray(currency: string): string[] {
  const lakhsList = [
    "l",
    "lac",
    "lak",
    "lakh",
    "lkah",
    "lahks",
    "laskh",
    "lach",
    "lakhs",
  ];
  const crList = ["c", "cr", "crore", "coreo", "crores"];
  const kList = ["k", "th", "thousand", "thousandsa", "thousands"];
  const hList = [
    "h",
    "handured",
    "heundred",
    "hundresd",
    "hundered",
    "hundred",
    "hundreds",
  ];
  const currencyTrimmed = currency.trim();
  const currencyWithoutComma = currencyTrimmed.replaceAll(",", "");
  const currencyWithoutUnderscoreAndComma = currencyWithoutComma.replaceAll(
    "_",
    "",
  );
  const currencyLowerCaseWithoutCommaAndUnderscore =
    currencyWithoutUnderscoreAndComma.toLowerCase();
  const arrOfNumbersAndWordsOfCurrency =
    currencyLowerCaseWithoutCommaAndUnderscore.match(/[0-9.]+|[a-zA-Z]+/g);
  const reformattedCurrencyArray: string[] = [];

  if (arrOfNumbersAndWordsOfCurrency == null) {
    return [];
  }

  for (let part of arrOfNumbersAndWordsOfCurrency) {
    part = part.trim();
    if (isNumeric(part)) {
      reformattedCurrencyArray.push(part);
    } else if (lakhsList.includes(part)) {
      reformattedCurrencyArray.push("lakh");
    } else if (crList.includes(part)) {
      reformattedCurrencyArray.push("crore");
    } else if (kList.includes(part)) {
      reformattedCurrencyArray.push("thousand");
    } else if (hList.includes(part)) {
      reformattedCurrencyArray.push("hundred");
    }
  }
  return reformattedCurrencyArray;
}

function isNumeric(str: string): boolean {
  if (typeof str != "string") throw new Error("we only process strings!");
  if (isNaN(Number(str))) return false;
  return true;
}

export const hardCodedData = {
  exchangeRate: 86.64,
  exchangeRateFetchButtonDisableTimeout: 3600000,
};
