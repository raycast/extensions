import { TrimOption } from "./types";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

/**
 * strips all newline characters from the string and replaces them witha space.
 */
export const strip = (str: string): string => {
  return str.replace(/[\r\n]/gm, " ");
};

export const trim = (str: string, trim: TrimOption): string => {
  switch (trim) {
    case "leading":
      return str.trimStart();
    case "trailing":
      return str.trimEnd();
    case "both":
      return str.trim();
    default:
      return str;
  }
};

interface StringTransformOptions {
  strip?: boolean;
  trim?: TrimOption;
}

export const transform = (str: string | undefined | null, opts: StringTransformOptions): string => {
  if (!str) return "";

  let result = str;
  if (opts.strip) result = strip(result);
  if (opts.trim) result = trim(result, opts.trim);

  return result;
};
