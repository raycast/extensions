import { Clipboard, showHUD } from "@raycast/api";
import { times, random, padStart } from "lodash";
import { IBAN } from "ibankit";

export const generateFakeSWIFT = (): string => {
  // Define a string containing all the letters in the alphabet
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  // Generate an array of 8 random letters by calling the `random` function
  // repeatedly

  const bic = times(8, () => {
    return letters[random(0, letters.length - 1)];
  }).join("");

  return bic;
};

export const generateFakeAccountNumber = (): string => {
  // Generate a random number between 0 and 999999999999999
  const MAX_ACCOUNT_NUMBER = 999999999999999;
  const randomNumber = random(0, MAX_ACCOUNT_NUMBER);

  // Pad the random number with leading zeros so that it has 15 digits
  const paddedNumber = padStart(randomNumber.toString(), 15, "0");

  // Return the padded number as a string
  return paddedNumber;
};

export const generateFakeSortCode = (): string => {
  // The length of a sort code is always six digits.
  const sortCodeLength = 6;
  let sortCode = "";

  for (let i = 0; i < sortCodeLength; i++) {
    // Generate a random number between 0 and 9.
    const randomNumber = Math.floor(Math.random() * 10);
    // Append the random number to the sort code.
    sortCode += randomNumber.toString();
  }

  return sortCode;
};

export const copyToClipboard = async (value: string): Promise<void> => {
  try {
    await Clipboard.copy(value);
    await showHUD("✅ Copied");
  } catch (error) {
    await showHUD("❌ Couldn't copy");
  }
};

export const copyIbanToClipboard = async () => {
  const iban = IBAN.random();
  await copyToClipboard(iban.toString());
};

export const copySwiftToClipboard = async () => {
  const swift = generateFakeSWIFT();
  await copyToClipboard(swift);
};

export const copyAccountNumberToClipboard = async () => {
  const accountNumber = generateFakeAccountNumber();
  await copyToClipboard(accountNumber);
};

export const copySortCodeToClipboard = async () => {
  const sortCode = generateFakeSortCode();
  await copyToClipboard(sortCode);
};
