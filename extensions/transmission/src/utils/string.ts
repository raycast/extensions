export const capitalize = (str: string, lower = false): string =>
  (lower ? str.toLowerCase() : str).replace(/(?:^|\s|["'([{])+\S/g, (match) => match.toUpperCase());

export const truncate = (str: string, length: number, ending = "…"): string => {
  if (length <= 0) {
    return "";
  }

  if (str.length <= length) {
    return str;
  }

  return str.substring(0, length - ending.length) + ending;
};

export const padStart = (str: string | number, length: number): string => {
  return String(str).padStart(length, " ");
};
