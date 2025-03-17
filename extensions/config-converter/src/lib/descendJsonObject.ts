import { KeyValuePair } from "./types";

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export function descendJsonObject(obj: any, path?: string) {
  const keyValuePairs: KeyValuePair[] = [];

  if (typeof obj !== "object" && path) {
    return [{ key: path, value: obj } satisfies KeyValuePair];
  }
  if (Array.isArray(obj)) {
    obj.forEach((element, index) => {
      const updatedPath = path ? `${path}__${index}` : index.toString();
      keyValuePairs.push(...descendJsonObject(element, updatedPath));
    });
    return keyValuePairs;
  }

  for (const key in obj) {
    const updatedPath = path ? `${path}__${key}` : key;
    keyValuePairs.push(...descendJsonObject(obj[key], updatedPath));
  }

  return keyValuePairs;
}
