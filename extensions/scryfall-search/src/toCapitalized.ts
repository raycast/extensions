/**
 * Turns first letter of a string to uppercase, capitalizing the string
 * @function
 *
 * @param   {string} str word to capitalized
 *
 * @returns {string} capitalized word
 */
export const toCapitalized = (str: string): string =>
  `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
