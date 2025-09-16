import { Clipboard, showHUD } from "@raycast/api";

const generateRandomNumber = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const padWithZerosToXDigits = (value: number, digits: number): string => value.toString().padStart(digits, "0");
const formatToTwoDigits = (value: number): string => padWithZerosToXDigits(value, 2);

export default async (): Promise<void> => {
  const randomYear = generateRandomNumber(0, 99);
  const randomMonth = generateRandomNumber(1, 12);
  const maxDaysInMonth = new Date(1900 + randomYear, randomMonth, 0).getDate();

  const randomDay = formatToTwoDigits(generateRandomNumber(1, maxDaysInMonth));
  const randomRand = generateRandomNumber(100, 999);

  const formattedYear = formatToTwoDigits(randomYear);
  const formattedMonth = formatToTwoDigits(randomMonth);

  const rrnFull = parseInt(`${formattedYear}${formattedMonth}${randomDay}${randomRand}`);
  const contr = formatToTwoDigits(97 - (rrnFull % 97));
  const rrnFullString = padWithZerosToXDigits(rrnFull, 9);

  const result = rrnFullString + contr;

  await Clipboard.copy(result);
  await showHUD(`✅ RRN ${result} copied to clipboard`);
};
