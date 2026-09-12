// Inspired by https://github.com/lindsaykwardell/natural-order

type NaturalSortInput = { title: string; [key: string]: unknown };

type SortOptions = {
  key: string;
  direction: "asc" | "desc";
  caseSensitive: boolean;
};

const defaultOptions: SortOptions = {
  key: "title",
  direction: "asc",
  caseSensitive: false,
};

const getSortFunction = <T extends NaturalSortInput>(options: SortOptions) => {
  return (aToken: T, bToken: T) => {
    const a = aToken[options.key];
    const b = bToken[options.key];

    if (typeof a !== "string" || typeof b !== "string") {
      return 0;
    }

    const EQUAL = 0;
    const GREATER = options.direction === "desc" ? -1 : 1;
    const SMALLER = -GREATER;

    const matchNumeric = /(^-?[0-9]+|[0-9]+$)/gi;

    const normalize = function normalize(value: string) {
      const str = "" + value;
      return options.caseSensitive ? str : str.toLowerCase();
    };

    // Return immediately if at least one of the values is null or undefined.
    if (!a && !b) return EQUAL;
    if (!a && b) return GREATER;
    if (a && !b) return SMALLER;

    // Normalize values to strings
    const x = normalize(a).trim() || "";
    const y = normalize(b).trim() || "";

    // Return immediately if at least one of the values is empty.
    if (!x && !y) return EQUAL;
    if (!x && y) return GREATER;
    if (x && !y) return SMALLER;

    // Isolate alpha and numeric. We put the numeric values between null character,
    const xArray = x.replace(matchNumeric, "\0$1\0").replace(/\0$/, "").replace(/^\0/, "").split("\0");
    const yArray = y.replace(matchNumeric, "\0$1\0").replace(/\0$/, "").replace(/^\0/, "").split("\0");

    // Natural sorting here
    for (let index = 0, maxIteration = Math.max(xArray.length, yArray.length); index < maxIteration; index++) {
      if (!xArray[index]) return SMALLER;
      if (!yArray[index]) return GREATER;

      const xItem = xArray[index];
      const yItem = yArray[index];

      // Do not take more time if they are equal
      if (xItem === yItem) continue;

      // Handle numeric vs string comparison
      // In case the tokens names havee no nomenclature
      // number < string
      if (isNaN(parseInt(xItem)) !== isNaN(parseInt(yItem))) return isNaN(parseInt(xItem)) ? GREATER : SMALLER;

      if (!isNaN(parseInt(xItem)) && !isNaN(parseInt(yItem))) {
        return parseInt(xItem) < parseInt(yItem) ? SMALLER : GREATER;
      }

      return xItem < yItem ? SMALLER : GREATER;
    }

    return EQUAL;
  };
};

export const naturalSort = <T extends NaturalSortInput>(list: Array<T>, options: Partial<SortOptions>): Array<T> => {
  const finalOptions = {
    ...defaultOptions,
    ...options,
  };

  return [...list].sort(getSortFunction<T>(finalOptions));
};
