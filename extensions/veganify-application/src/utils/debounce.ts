type DebouncedFunction<T extends (...args: never[]) => unknown> = ((...args: Parameters<T>) => void) & {
  cancel: () => void;
};

export function debounce<T extends (...args: never[]) => unknown>(func: T, wait: number): DebouncedFunction<T> {
  let timeout: NodeJS.Timeout | null = null;

  const debouncedFunc = (...args: Parameters<T>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };

  const cancelFunc = (): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
  };

  return Object.assign(debouncedFunc, { cancel: cancelFunc });
}
