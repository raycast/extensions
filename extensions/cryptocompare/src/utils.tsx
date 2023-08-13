/**
 * Delays the execution of code by the specified number of milliseconds.
 *
 * @param {number} ms - The number of milliseconds to delay the execution.
 * @return {Promise<void>} A Promise that resolves after the specified delay.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Formats a number to a string with 6 decimal places.
 *
 * @param {number} num - The number to be formatted.
 * @return {string} The formatted number as a string.
 */
export function formatNumber(num: number): string {
  const formattedNum = num.toFixed(6).replace(/\.?0*$/, "");
  return formattedNum;
}
