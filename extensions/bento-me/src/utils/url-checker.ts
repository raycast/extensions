/**
 * Checks if the provided string is a valid URL.
 *
 * @param {string} string - The string to validate as a URL.
 * @returns {boolean} `true` if the string is a valid URL, otherwise `false`.
 */
function isValidUrl(string: string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export { isValidUrl };
