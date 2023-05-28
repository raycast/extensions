import { times, random, padStart } from "lodash";
import { Clipboard, showHUD } from "@raycast/api";

export const generateFakeSWIFT = (): string => {
  // Define a string containing all the letters in the alphabet
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  // Generate an array of 8 random letters by calling the `random` function
  // repeatedly

  const bic = times(8, () => {
    return letters[random(0, letters.length - 1)];
  }).join("");

  return bic
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

export const copyToClipboard = async (value: string): Promise<void> => {
  try {
    await Clipboard.copy(value);
    await showHUD("✅ Copied");
  } catch (error) {
    await showHUD("❌ Couldn't copy");
  }
};
