/**
 * Creates a debounced function that delays invoking the original function until after `wait` milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @template Args - The argument types of the function
 * @template R - The return type of the function
 * @param {(...args: Args) => R} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {(...args: Args) => Promise<R>} A new debounced function
 */
export const debounce = <Args extends unknown[], R>(
  func: (...args: Args) => R,
  wait: number
): ((...args: Args) => Promise<R>) => {
  let timeout: NodeJS.Timeout | null;

  return (...args: Args) => {
    return new Promise<R>((resolve) => {
      // Clear the previous timeout if it exists
      if (timeout) clearTimeout(timeout);

      // Set a new timeout
      timeout = setTimeout(async () => {
        // Execute the original function and resolve the promise with its result
        const result = await func.apply(this, args);
        resolve(result);
      }, wait);
    });
  };
};
