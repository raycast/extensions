let units: string[];
let tens: string[];
let allDoubles: string[];
let CRORE: string;
let LAKH: string;
let THOUSAND: string;
let HUNDRED: string;

function initializedConstants(short: boolean, numberShouldNumeric: boolean) {
  allDoubles = [];
  if (numberShouldNumeric) {
    units = [
      "",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
    ];
    const ones = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    tens = ["", "", "20", "30", "40", "50", "60", "70", "80", "90"];

    // 1, 0
    for (let i = 1; i < ones.length; i++) {
      for (let j = 0; j < ones.length; j++) {
        allDoubles[i * 10 + j] = ones[i] + ones[j];
      }
    }
  } else {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];

    units = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    // 1, 0
    for (let i = 2; i < ones.length; i++) {
      for (let j = 0; j < ones.length; j++) {
        if (j === 0) {
          allDoubles[i * 10] = tens[i];
        } else {
          allDoubles[i * 10 + j] = tens[i] + " " + ones[j];
        }
      }
    }
  }

  if (short) {
    CRORE = "Cr";
    LAKH = "Lac";
    THOUSAND = "K";
    HUNDRED = "H";
  } else {
    CRORE = "Crore";
    LAKH = "Lakh";
    THOUSAND = "Thousand";
    HUNDRED = "Hundred";
  }
}

export function inrToWords(
  inputCurrencyString: string | number,
  short = false,
  numberShouldNumeric = false,
): string {
  if (inputCurrencyString === undefined) {
    throw new Error("inrToWords can't be blank");
  }
  if (inputCurrencyString === "0") return "Zero";

  initializedConstants(short, numberShouldNumeric);

  inputCurrencyString = inputCurrencyString.toString();

  let resultStr = "";
  let isLastPar = false;
  try {
    while (inputCurrencyString.length !== 0) {
      if (inputCurrencyString.length <= 7) {
        isLastPar = true;
      }
      let exactDigits = extractLastNDigits(inputCurrencyString, 7);
      exactDigits = trimLeadingZeros(exactDigits);
      const len = exactDigits.length;
      if (len === 7) {
        resultStr = handle7Digits(exactDigits).trim() + resultStr;
      } else if (len === 6) {
        resultStr = handle6Digits(exactDigits).trim() + resultStr;
      } else if (len === 5) {
        resultStr = handle5Digits(exactDigits).trim() + resultStr;
      } else if (len === 4) {
        resultStr = handle4Digits(exactDigits, isLastPar).trim() + resultStr;
      } else if (len === 3) {
        resultStr = handle3Digits(exactDigits).trim() + resultStr;
      } else if (len === 2) {
        resultStr = handle2Digits(exactDigits).trim() + resultStr;
      } else if (len === 1) {
        resultStr = handle1Digits(exactDigits).trim() + resultStr;
      }
      inputCurrencyString = trimLastNDigits(inputCurrencyString, 7);

      if (inputCurrencyString.length !== 0) {
        resultStr = " " + CRORE + " " + resultStr.trim();
      }
    }

    return resultStr.trim();
  } catch {
    return "Error";
  }
}

// lakhs + thousands + hundreds
function handle7Digits(sevenDigits: string) {
  // 01 23 456
  let lakhPlace = handle2Digits(sevenDigits.slice(0, 2));
  const remainingPlaces = handle5Digits(sevenDigits.slice(2, 7));

  if (lakhPlace.length !== 0) lakhPlace += " " + LAKH + " ";
  return lakhPlace + remainingPlaces;
}

function handle6Digits(sixDigits: string) {
  // 0 12 345
  let lakhPlace = handle1Digits(sixDigits.slice(0, 1));
  const remainingPlaces = handle5Digits(sixDigits.slice(1, 6));

  if (lakhPlace.length !== 0) lakhPlace += " " + LAKH + " ";
  return lakhPlace + remainingPlaces;
}

function handle5Digits(fiveDigits: string): string {
  const exactDigits = trimLeadingZeros(fiveDigits);
  const len = exactDigits.length;
  if (len === 0) {
    return "";
  } else if (len === 1) {
    return handle1Digits(exactDigits);
  } else if (len === 2) {
    return handle2Digits(exactDigits);
  } else if (len === 3) {
    return handle3Digits(exactDigits);
  } else if (len === 4) {
    return handle4Digits(exactDigits);
  } else if (len === 5) {
    // 01 234
    let thousandPlace = handle2Digits(fiveDigits.slice(0, 2));
    const tripleDigits = handle3Digits(fiveDigits.slice(2, 5));

    if (thousandPlace.length !== 0) thousandPlace += " " + THOUSAND + " ";
    return thousandPlace + tripleDigits;
  }
  return "";
}

function handle4Digits(fourDigits: string, isLastPart?: boolean) {
  const secondDigitOfFirstTwoDigit = fourDigits.slice(1, 2);
  if (isLastPart && secondDigitOfFirstTwoDigit !== "0") {
    // 2201 (22 hundred 1)
    let hundredPlace = handle2Digits(fourDigits.slice(0, 2));
    const doubleDigit = handle2Digits(fourDigits.slice(2, 4));

    if (hundredPlace.length !== 0) hundredPlace += " " + HUNDRED + " ";
    return hundredPlace + doubleDigit;
  } else {
    // 0 123
    // 4001 (won't be 40 hundred one but will be 4 thousand 1) 2024 will be 2 thousand 24
    let thousandPlace = handle1Digits(fourDigits.slice(0, 1));
    const tripleDigits = handle3Digits(fourDigits.slice(1, 4));

    if (thousandPlace.length !== 0) thousandPlace += " " + THOUSAND + " ";

    return thousandPlace + tripleDigits;
  }
}

function handle3Digits(threeDigits: string): string {
  const exactDigits = trimLeadingZeros(threeDigits);
  const len = exactDigits.length;
  if (len === 0) {
    return "";
  } else if (len === 1) {
    return handle1Digits(exactDigits);
  } else if (len === 2) {
    return handle2Digits(exactDigits);
  } else if (len === 3) {
    // 0 12
    let hundredPlace = handle1Digits(exactDigits.slice(0, 1));
    const doubleDigit = handle2Digits(exactDigits.slice(1, 3));

    if (hundredPlace.length !== 0) hundredPlace += " " + HUNDRED + " ";
    return hundredPlace + doubleDigit;
  }
  return "";
}

function handle2Digits(twoDigits: string): string {
  const exactDigits = trimLeadingZeros(twoDigits);
  const len = exactDigits.length;

  if (len === 0) {
    return "";
  } else if (len === 1) {
    return handle1Digits(exactDigits);
  } else if (len === 2) {
    const num = parseInt(exactDigits);
    if (num < 20) {
      // for 11 to 19
      return units[num];
    } else if (num >= 20) {
      return allDoubles[num];
    }
  }
  return "";
}

function handle1Digits(oneDigits: string): string {
  return units[parseInt(oneDigits)];
}

function trimLastNDigits(inputCurrencyString: string, digitsToTrim: number) {
  return inputCurrencyString.slice(0, -digitsToTrim);
}

function extractLastNDigits(str: string, digitsToExtract: number) {
  return str.slice(-digitsToExtract);
}

function trimLeadingZeros(str: string) {
  return str.replace(/^0+/, "");
}
