/**
 * Create a throttled version of a function
 * The function will only be called at most once per `limit` milliseconds
 */
export function throttle<TArgs extends unknown[], TReturn>(
  func: (...args: TArgs) => TReturn,
  limit: number,
): (...args: TArgs) => void {
  let inThrottle = false;
  let lastArgs: TArgs | null = null;

  const throttled = (...args: TArgs): void => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };

  return throttled;
}

/**
 * Create a debounced version of a function
 * The function will only be called after `delay` milliseconds of inactivity
 */
export function debounce<TArgs extends unknown[], TReturn>(
  func: (...args: TArgs) => TReturn,
  delay: number,
): (...args: TArgs) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: TArgs): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };

  return debounced;
}
