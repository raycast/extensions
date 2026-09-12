// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  let timeout: NodeJS.Timeout | null;
  return (...args: Parameters<T>) => {
    return new Promise<ReturnType<T>>((resolve) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const result = await func.apply(this, args);
        resolve(result);
      }, wait);
    });
  };
};
