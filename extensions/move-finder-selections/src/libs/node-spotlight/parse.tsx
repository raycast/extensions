const parseDate = (s: string) => new Date(s);
const parseString = (s: string) => {
  if (s[0] === '"' && s[s.length - 1] === '"') return s.slice(1, -1);
  return s;
};
const parseBoolean = (s: string) => s.toLowerCase() === "true";

const parseArray =
  (f: string | ((s: string) => number) | ((s: string) => string) | ((s: string) => Date)) => (l: string) =>
    l
      .slice(2, -2)
      .split(",\n")
      .map((s: string) => s.replace(/^\s+/, ""))
      .map(f as (value: string, index: number, array: string[]) => number);

const parseArrayOfStrings = parseArray(parseString); // perf

export { parseDate, parseString, parseBoolean, parseArray, parseArrayOfStrings };
