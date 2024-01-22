/**
 * Utility to uppercase only the first character of a given string
 * @param str Input string
 * @returns The input string with only the first character uppercased
 */
export const upperCaseFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const numberToHex = (number: number): string => {
  return number.toString(16).padStart(4, "0").toUpperCase();
};
