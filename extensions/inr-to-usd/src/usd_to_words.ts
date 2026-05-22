function numberToUSWords(usDollars: number): string {
  const translations = new Map<number, string>([
    [1000000000, "Billion"],
    [1000000, "Million"],
    [1000, "Thousand"],
    [100, "Hundred"],
    [90, "Ninety"],
    [80, "Eighty"],
    [70, "Seventy"],
    [60, "Sixty"],
    [50, "Fifty"],
    [40, "Forty"],
    [30, "Thirty"],
    [20, "Twenty"],
    [19, "Nineteen"],
    [18, "Eighteen"],
    [17, "Seventeen"],
    [16, "Sixteen"],
    [15, "Fifteen"],
    [14, "Fourteen"],
    [13, "Thirteen"],
    [12, "Twelve"],
    [11, "Eleven"],
    [10, "Ten"],
    [9, "Nine"],
    [8, "Eight"],
    [7, "Seven"],
    [6, "Six"],
    [5, "Five"],
    [4, "Four"],
    [3, "Three"],
    [2, "Two"],
    [1, "One"],
  ]);
  if (usDollars === 0) return "Zero";
  if (usDollars <= 20) return translations.get(usDollars) || "";

  const result: string[] = [];
  for (const [value, translation] of translations) {
    const times = Math.floor(usDollars / value);
    if (times === 0) continue;
    usDollars -= times * value;
    if (times === 1 && value >= 100) {
      result.push("One", translation);
    } else if (times === 1) {
      result.push(translation);
    } else {
      result.push(numberToUSWords(times), translation);
    }
  }
  return result.join(" ");
}

export function convertDollarsAndCents(amount: number): string {
  if (isNaN(amount)) return "Invalid Number: " + amount;
  const [dollars, centsPart] = amount.toString().split(".");
  const cents = centsPart ? parseInt(centsPart.slice(0, 2)) : 0;
  const extraDecimals = centsPart && centsPart.length > 2;
  let dollarPart = dollars
    ? numberToUSWords(parseInt(dollars)) +
      (parseInt(dollars) === 1 ? " Dollar" : " Dollars")
    : "";
  const centPart = cents
    ? numberToUSWords(cents) + (cents === 1 ? " Cent" : " Cents")
    : "";

  if (extraDecimals) {
    dollarPart = "~ " + dollarPart;
  }
  if (dollarPart && centPart) {
    return dollarPart + " and " + centPart;
  } else if (dollarPart) {
    return dollarPart;
  } else if (centPart) {
    return centPart;
  }
  return "";
}
