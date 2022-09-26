import xor from "lodash.xor";

export const methodPrettyName = (method: string | (() => void)): string => {
  return typeof method === "function" ? method.name.replace("bound", "") : "unknown";
};

export const xorKeysSorted = (items: string[], exclusions: string[]) => {
  return xor(items, exclusions).sort((a: string, b: string) => a.localeCompare(b));
};
