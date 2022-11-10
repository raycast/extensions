export const isEmpty = (str: string | null | undefined): boolean => {
  if (!str) return true;
  return String(str).trim().length === 0;
};

/**
 * strips all newline characters from the string and replaces them witha space.
 */
export const trim = (str: string | undefined | null): string => {
  if (!str) return "";
  return str.replace(/[\r\n]/gm, " ");
};
