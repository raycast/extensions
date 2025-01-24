/**
 * Convert smart text to plain text
 * @param {string} input - The input text containing smart characters
 * @returns {string} - The converted plain text
 */
export function convertSmartText(input: string): string {
  const replacements: { [key: string]: string } = {
    "‘": "'", // Left single quote
    "’": "'", // Right single quote
    "“": '"', // Left double quote
    "”": '"', // Right double quote
    "—": "-", // Em dash
    "–": "-", // En dash
  };

  const pattern = new RegExp(Object.keys(replacements).join("|"), "g");
  return input.replace(pattern, (match) => replacements[match]);
}
