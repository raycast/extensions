export const debounce = <Fn extends (...args: any) => any>(func: Fn, delay = 200) => {
  let timeout: NodeJS.Timeout;
  const debounced = (...args: any) => {
    clearTimeout(timeout as NodeJS.Timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
  return debounced as (...args: Parameters<Fn>) => ReturnType<Fn>;
};
