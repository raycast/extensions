/**
 * Parses the dropdown value into a type and a value.
 * Used to support multiple independent states in a single List.Dropdown with storeValue.
 */
export function parseDropdownValue(value: string): [string, string] {
  const parts = value.split(":");
  if (parts.length < 2) return ["", value];
  return [parts[0], parts.slice(1).join(":")];
}
