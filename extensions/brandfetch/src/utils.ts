// eslint-disable-next-line @typescript-eslint/ban-types
export const debounce = (fn: Function, delay: number) => {
  let timer: NodeJS.Timeout;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (...args: any[]) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};
