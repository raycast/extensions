export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

/**
 * strips all newline characters from the string and replaces them witha space.
 */
export const trim = (str: string | undefined | null): string => {
  if (!str) return "";
  return str.replace(/[\r\n]/gm, " ");
};
