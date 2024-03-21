export function prettyPrint(json: unknown) {
  return JSON.stringify(json, null, 2);
}
