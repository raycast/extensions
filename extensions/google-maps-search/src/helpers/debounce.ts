/**
 * Creates a debounced function that delays invoking the original function until after `wait` milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @template T - The type of the function to be debounced
 * @param {T} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {(...args: Parameters<T>) => Promise<ReturnType<T>>} A new debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  let timeout: NodeJS.Timeout | null;

  return (...args: Parameters<T>) => {
    return new Promise<ReturnType<T>>((resolve) => {
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
