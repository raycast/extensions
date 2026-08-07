export const replaceAll = (str: string, search: string, replace: string) => {
  const esc = search.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const reg = new RegExp(esc, "ig");
  return str.replace(reg, replace);
};
