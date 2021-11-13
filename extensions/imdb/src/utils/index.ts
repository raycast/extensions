let timeout: NodeJS.Timeout;
export const debounce = function (func: () => void, delay: number) {
  clearTimeout(timeout);
  timeout = setTimeout(func, delay);
};
