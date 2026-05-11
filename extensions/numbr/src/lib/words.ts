const BELOW_TWENTY = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

const SCALES = [
  { value: 1_000_000_000_000_000, name: "quadrillion" },
  { value: 1_000_000_000_000, name: "trillion" },
  { value: 1_000_000_000, name: "billion" },
  { value: 1_000_000, name: "million" },
  { value: 1_000, name: "thousand" },
];

export function numberToWords(value: number): string {
  if (!Number.isFinite(value)) return String(value);

  if (!Number.isInteger(value)) {
    return decimalNumberToWords(value);
  }

  if (value < 0) {
    return `minus ${numberToWords(Math.abs(value))}`;
  }

  if (value < 20) {
    return BELOW_TWENTY[value];
  }

  if (value < 100) {
    const tens = Math.floor(value / 10);
    const remainder = value % 10;

    return remainder === 0 ? TENS[tens] : `${TENS[tens]} ${BELOW_TWENTY[remainder]}`;
  }

  if (value < 1_000) {
    const hundreds = Math.floor(value / 100);
    const remainder = value % 100;

    return remainder === 0
      ? `${BELOW_TWENTY[hundreds]} hundred`
      : `${BELOW_TWENTY[hundreds]} hundred ${numberToWords(remainder)}`;
  }

  for (const scale of SCALES) {
    if (value >= scale.value) {
      const major = Math.floor(value / scale.value);
      const remainder = value % scale.value;

      return remainder === 0
        ? `${numberToWords(major)} ${scale.name}`
        : `${numberToWords(major)} ${scale.name} ${numberToWords(remainder)}`;
    }
  }

  return String(value);
}

function decimalNumberToWords(value: number): string {
  const [integerPart, decimalPart] = String(value).split(".");

  const integerWords = numberToWords(Number(integerPart));
  const decimalWords = decimalPart
    .split("")
    .map((digit) => BELOW_TWENTY[Number(digit)])
    .join(" ");

  return `${integerWords} point ${decimalWords}`;
}
